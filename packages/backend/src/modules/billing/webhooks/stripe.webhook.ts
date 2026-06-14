import { Injectable, Logger, RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '@/database/prisma.service';
import { SubscriptionService } from '../services/subscription.service';
import { PaymentService } from '../services/payment.service';
import { InvoiceService } from '../services/invoice.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class StripeWebhookHandler {
  private readonly logger = new Logger(StripeWebhookHandler.name);
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    private paymentService: PaymentService,
    private invoiceService: InvoiceService,
    private configService: ConfigService,
    @InjectQueue('billing') private billingQueue: Queue,
  ) {
    const stripeKey = this.configService.get('STRIPE_SECRET_KEY');
    this.webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');

    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    }
  }

  async handleWebhook(req: RawBodyRequest<any>): Promise<void> {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = req.rawBody;

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw error;
    }

    this.logger.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.created':
        await this.handleInvoiceCreated(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        this.logger.warn(`Unhandled webhook event: ${event.type}`);
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);

    await this.paymentService.handlePaymentSuccess(paymentIntent.id);

    // Queue event for analytics
    await this.billingQueue.add(
      'payment-succeeded',
      {
        paymentIntentId: paymentIntent.id,
        userId: paymentIntent.metadata?.userId,
        amount: paymentIntent.amount,
      },
      { removeOnComplete: true },
    );
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment failed: ${paymentIntent.id}`);

    const failureMessage =
      paymentIntent.last_payment_error?.message || 'Payment failed';

    await this.paymentService.handlePaymentFailure(
      paymentIntent.id,
      failureMessage,
    );

    // Queue event
    await this.billingQueue.add(
      'payment-failed',
      {
        paymentIntentId: paymentIntent.id,
        userId: paymentIntent.metadata?.userId,
        reason: failureMessage,
      },
      { removeOnComplete: true },
    );
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Subscription updated: ${subscription.id}`);

    // Update subscription in database
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });

    // Queue event
    await this.billingQueue.add(
      'subscription-updated',
      {
        subscriptionId: subscription.id,
        userId: subscription.metadata?.userId,
      },
      { removeOnComplete: true },
    );
  }

  private async handleSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Subscription cancelled: ${subscription.id}`);

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    // Queue event
    await this.billingQueue.add(
      'subscription-cancelled-webhook',
      {
        subscriptionId: subscription.id,
        userId: subscription.metadata?.userId,
      },
      { removeOnComplete: true },
    );
  }

  private async handleInvoiceCreated(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Invoice created: ${invoice.id}`);

    // Store invoice reference
    await this.prisma.invoice.updateMany({
      where: { stripeInvoiceId: invoice.id },
      data: {
        stripeInvoiceId: invoice.id,
      },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Invoice paid: ${invoice.id}`);

    if (invoice.id) {
      await this.invoiceService.markInvoicePaid(invoice.id);
    }

    // Queue event
    await this.billingQueue.add(
      'invoice-paid',
      {
        invoiceId: invoice.id,
        userId: invoice.metadata?.userId,
        amount: invoice.amount_paid,
      },
      { removeOnComplete: true },
    );
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    this.logger.log(`Charge refunded: ${charge.id}`);

    // Update payment status
    await this.prisma.payment.updateMany({
      where: { stripeChargeId: charge.id },
      data: { status: 'REFUNDED' },
    });

    // Queue event
    await this.billingQueue.add(
      'charge-refunded',
      {
        chargeId: charge.id,
        userId: charge.metadata?.userId,
        amount: charge.amount_refunded,
      },
      { removeOnComplete: true },
    );
  }
}
