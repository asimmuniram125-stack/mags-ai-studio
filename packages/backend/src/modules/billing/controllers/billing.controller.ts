import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { Response } from 'express';
import { PlanService } from '../services/plan.service';
import { SubscriptionService } from '../services/subscription.service';
import { PaymentService } from '../services/payment.service';
import { CreditService } from '../services/credit.service';
import { InvoiceService } from '../services/invoice.service';
import { UsageService } from '../services/usage.service';
import { CreateSubscriptionDto, UpgradeSubscriptionDto, CancelSubscriptionDto } from '../dto/subscription.dto';
import { CreateCheckoutSessionDto } from '../dto/payment.dto';
import { AddCreditDto, DeductCreditDto } from '../dto/credit.dto';

@Controller('billing')
export class BillingController {
  constructor(
    private planService: PlanService,
    private subscriptionService: SubscriptionService,
    private paymentService: PaymentService,
    private creditService: CreditService,
    private invoiceService: InvoiceService,
    private usageService: UsageService,
  ) {}

  // ==================== PLANS ====================

  @Get('plans')
  async getAllPlans() {
    return this.planService.getAllPlans();
  }

  @Get('plans/:id')
  async getPlan(@Param('id') id: string) {
    return this.planService.getPlanById(id);
  }

  // ==================== SUBSCRIPTIONS ====================

  @Post('subscription/create')
  @UseGuards(AuthGuard('jwt'))
  async createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionService.createSubscription(user.id, dto);
  }

  @Get('subscription')
  @UseGuards(AuthGuard('jwt'))
  async getSubscription(@CurrentUser() user: any) {
    return this.subscriptionService.getSubscription(user.id);
  }

  @Post('subscription/upgrade')
  @UseGuards(AuthGuard('jwt'))
  async upgradeSubscription(
    @Body() dto: UpgradeSubscriptionDto,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionService.upgradeSubscription(user.id, dto);
  }

  @Post('subscription/downgrade')
  @UseGuards(AuthGuard('jwt'))
  async downgradeSubscription(
    @Body() dto: UpgradeSubscriptionDto,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionService.downgradeSubscription(user.id, dto);
  }

  @Post('subscription/cancel')
  @UseGuards(AuthGuard('jwt'))
  async cancelSubscription(
    @Body() dto: CancelSubscriptionDto,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionService.cancelSubscription(user.id, dto);
  }

  // ==================== PAYMENTS ====================

  @Post('create-checkout')
  @UseGuards(AuthGuard('jwt'))
  async createCheckout(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentUser() user: any,
  ) {
    const plan = await this.planService.getPlanByType(dto.planType);
    const amount =
      dto.billingPeriod === 'MONTHLY' ? plan.monthlyPrice : plan.yearlyPrice;

    const payment = await this.paymentService.createPayment(user.id, {
      amount,
      currency: 'USD',
      description: `Subscription: ${plan.name}`,
      metadata: {
        planId: plan.id,
        planType: dto.planType,
        billingPeriod: dto.billingPeriod,
        successUrl: dto.successUrl,
        cancelUrl: dto.cancelUrl,
      },
    });

    return payment;
  }

  @Get('payments/history')
  @UseGuards(AuthGuard('jwt'))
  async getPaymentHistory(
    @CurrentUser() user: any,
  ) {
    return this.paymentService.getPaymentHistory(user.id);
  }

  @Post('payments/:id/refund')
  @UseGuards(AuthGuard('jwt'))
  async refundPayment(
    @Param('id') paymentId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    const payment = await (this.paymentService as any).prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (payment.userId !== user.id) {
      throw new BadRequestException('Unauthorized');
    }

    return this.paymentService.refundPayment(paymentId, reason);
  }

  // ==================== CREDITS ====================

  @Get('credits/balance')
  @UseGuards(AuthGuard('jwt'))
  async getCreditBalance(@CurrentUser() user: any) {
    return this.creditService.getWallet(user.id);
  }

  @Post('credits/add')
  @UseGuards(AuthGuard('jwt'))
  async addCredit(
    @Body() dto: AddCreditDto,
    @CurrentUser() user: any,
  ) {
    return this.creditService.addCredit(user.id, dto);
  }

  @Post('credits/deduct')
  @UseGuards(AuthGuard('jwt'))
  async deductCredit(
    @Body() dto: DeductCreditDto,
    @CurrentUser() user: any,
  ) {
    return this.creditService.deductCredit(user.id, dto);
  }

  @Get('credits/history')
  @UseGuards(AuthGuard('jwt'))
  async getCreditHistory(@CurrentUser() user: any) {
    return this.creditService.getTransactionHistory(user.id);
  }

  @Get('credits/check/:amount')
  @UseGuards(AuthGuard('jwt'))
  async checkCreditBalance(
    @Param('amount') amount: number,
    @CurrentUser() user: any,
  ) {
    const hasBalance = await this.creditService.checkBalance(user.id, amount);
    return { hasBalance };
  }

  // ==================== INVOICES ====================

  @Get('invoices')
  @UseGuards(AuthGuard('jwt'))
  async getInvoices(@CurrentUser() user: any) {
    return this.invoiceService.getInvoices(user.id);
  }

  @Get('invoices/:id')
  @UseGuards(AuthGuard('jwt'))
  async getInvoice(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const invoice = await this.invoiceService.getInvoice(id);

    if (invoice.userId !== user.id) {
      throw new BadRequestException('Unauthorized');
    }

    return invoice;
  }

  @Get('invoices/:id/download')
  @UseGuards(AuthGuard('jwt'))
  async downloadInvoice(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const invoice = await this.invoiceService.getInvoice(id);

    if (invoice.userId !== user.id) {
      throw new BadRequestException('Unauthorized');
    }

    const pdf = await this.invoiceService.generatePdfInvoice(id);

    res.contentType('application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    );
    res.send(pdf);
  }

  // ==================== USAGE ====================

  @Get('usage/monthly')
  @UseGuards(AuthGuard('jwt'))
  async getMonthlyUsage(@CurrentUser() user: any) {
    return this.usageService.getMonthlyUsage(user.id);
  }

  @Get('usage/stats')
  @UseGuards(AuthGuard('jwt'))
  async getUserUsageStats(
    @CurrentUser() user: any,
  ) {
    return this.usageService.getUserUsageStats(user.id);
  }
}
