import { IsEnum, IsString, IsOptional } from 'class-validator';
import { BillingPeriod, PlanType } from '../entities/billing.entity';

export class CreateSubscriptionDto {
  @IsEnum(PlanType)
  planType: PlanType;

  @IsEnum(BillingPeriod)
  billingPeriod: BillingPeriod;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}

export class UpgradeSubscriptionDto {
  @IsEnum(PlanType)
  newPlanType: PlanType;

  @IsOptional()
  @IsEnum(BillingPeriod)
  newBillingPeriod?: BillingPeriod;
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class SubscriptionResponseDto {
  id: string;
  userId: string;
  planId: string;
  status: string;
  billingPeriod: BillingPeriod;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
