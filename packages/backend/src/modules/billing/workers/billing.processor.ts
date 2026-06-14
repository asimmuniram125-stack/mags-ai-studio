import { Injectable, Logger } from '@nestjs/common';
import { Worker, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '@/database/prisma.service';
import { SubscriptionService } from '../services/subscription.service';
import { InvoiceService } from '../services/invoice.service';
import { UsageService } from '../services/usage.service';
import { CronJob } from 'cron';

@Injectable()
export class BillingProcessor {
  private readonly logger = new Logger(BillingProcessor.name);
  private worker: Worker;
  private renewalCron: CronJob;
  private invoicingCron: CronJob;

  constructor(
    @InjectQueue('billing') private billingQueue: Queue,
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    private invoiceService: InvoiceService,
    private usageService: UsageService,
  ) {
    this.setupWorker();
    this.setupCronJobs();
  }

  private setupWorker(): void {
    this.worker = new Worker(
      'billing',
      async (job) => {
        switch (job.name) {
          case 'subscription-created':
            await this.handleSubscriptionCreated(job.data);
            break;
          case 'subscription-upgraded':
            await this.handleSubscriptionUpgraded(job.data);
            break;
          case 'subscription-cancelled':
            await this.handleSubscriptionCancelled(job.data);
            break;
          case 'payment-succeeded':
            await this.handlePaymentSucceeded(job.data);
            break;
          case 'payment-failed':
            await this.handlePaymentFailed(job.data);
            break;
          case 'invoice-created':
            await this.handleInvoiceCreated(job.data);
            break;
          case 'credit-added':
            await this.handleCreditAdded(job.data);
            break;
          case 'credit-deducted':
            await this.handleCreditDeducted(job.data);
            break;
          default:
            this.logger.warn(`Unknown job type: ${job.name}`);
        }
      },
      { connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 } },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Billing job ${job?.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Billing job ${job?.id} failed:`, err);
    });
  }

  private setupCronJobs(): void {
    // Renew subscriptions at midnight every day
    this.renewalCron = new CronJob('0 0 * * *', async () => {
      this.logger.log('Running subscription renewal cron');
      await this.processSubscriptionRenewals();
    });

    // Generate invoices on the 1st of each month at 2 AM
    this.invoicingCron = new CronJob('0 2 1 * *', async () => {
      this.logger.log('Running invoice generation cron');
      await this.processMonthlyInvoicing();
    });

    this.renewalCron.start();
    this.invoicingCron.start();
  }

  private async processSubscriptionRenewals(): Promise<void> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { lte: new Date() },
      },
      include: { user: true },
    });

    for (const subscription of subscriptions) {
      try {
        await this.subscriptionService.renewSubscription(subscription.id);
        this.logger.log(`Renewed subscription: ${subscription.id}`);
      } catch (error) {
        this.logger.error(`Failed to renew subscription ${subscription.id}:`, error);
      }
    }
  }

  private async processMonthlyInvoicing(): Promise<void> {
    const users = await this.prisma.user.findMany();

    for (const user of users) {
      try {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

        await this.invoiceService.createInvoice({
          userId: user.id,
          periodStart: startDate,
          periodEnd: endDate,
        });

        this.logger.log(`Generated invoice for user: ${user.id}`);
      } catch (error) {
        this.logger.error(`Failed to generate invoice for user ${user.id}:`, error);
      }
    }
  }

  private async handleSubscriptionCreated(data: any): Promise<void> {
    this.logger.log(`Processing subscription created event: ${data.subscriptionId}`);
    // Send welcome email, update analytics, etc.
  }

  private async handleSubscriptionUpgraded(data: any): Promise<void> {
    this.logger.log(`Processing subscription upgraded event: ${data.subscriptionId}`);
    // Send upgrade confirmation, update analytics
  }

  private async handleSubscriptionCancelled(data: any): Promise<void> {
    this.logger.log(`Processing subscription cancelled event: ${data.subscriptionId}`);
    // Send cancellation email, cleanup resources
  }

  private async handlePaymentSucceeded(data: any): Promise<void> {
    this.logger.log(`Processing payment succeeded event: ${data.paymentIntentId}`);
    // Update user analytics, send receipt
  }

  private async handlePaymentFailed(data: any): Promise<void> {
    this.logger.log(`Processing payment failed event: ${data.paymentIntentId}`);
    // Send retry notification, alert support if repeated failures
  }

  private async handleInvoiceCreated(data: any): Promise<void> {
    this.logger.log(`Processing invoice created event: ${data.invoiceId}`);
    // Send invoice email
  }

  private async handleCreditAdded(data: any): Promise<void> {
    this.logger.log(`Processing credit added event for user: ${data.userId}`);
    // Update user notifications
  }

  private async handleCreditDeducted(data: any): Promise<void> {
    this.logger.log(`Processing credit deducted event for user: ${data.userId}`);
    // Check low balance, send alerts if needed
  }
}
