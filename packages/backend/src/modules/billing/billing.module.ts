import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '@/database/prisma.service';
import { BillingController } from './controllers/billing.controller';
import { PlanService } from './services/plan.service';
import { SubscriptionService } from './services/subscription.service';
import { PaymentService } from './services/payment.service';
import { CreditService } from './services/credit.service';
import { InvoiceService } from './services/invoice.service';
import { UsageService } from './services/usage.service';
import { StripeWebhookHandler } from './webhooks/stripe.webhook';

@Module({
  imports: [BullModule.registerQueue({ name: 'billing' })],
  controllers: [BillingController],
  providers: [
    PrismaService,
    PlanService,
    SubscriptionService,
    PaymentService,
    CreditService,
    InvoiceService,
    UsageService,
    StripeWebhookHandler,
  ],
  exports: [
    PlanService,
    SubscriptionService,
    PaymentService,
    CreditService,
    InvoiceService,
    UsageService,
  ],
})
export class BillingModule {}
