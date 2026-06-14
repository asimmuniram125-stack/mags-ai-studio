import { IsEnum, IsNumber, IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { PlanType } from '../entities/billing.entity';

export class PlanFeaturesDto {
  @IsNumber()
  chatTokensPerMonth: number;

  @IsNumber()
  agentExecutionsPerMonth: number;

  @IsNumber()
  appsPerMonth: number;

  @IsNumber()
  deploymentsPerMonth: number;

  @IsNumber()
  analyticsRetentionDays: number;

  @IsBoolean()
  customDomain: boolean;

  @IsBoolean()
  priority: boolean;

  @IsBoolean()
  apiAccess: boolean;
}

export class CreatePlanDto {
  @IsEnum(PlanType)
  type: PlanType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  monthlyPrice: number;

  @IsNumber()
  yearlyPrice: number;

  @IsObject()
  features: PlanFeaturesDto;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  monthlyPrice?: number;

  @IsOptional()
  @IsNumber()
  yearlyPrice?: number;

  @IsOptional()
  @IsObject()
  features?: PlanFeaturesDto;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class PlanResponseDto {
  id: string;
  type: PlanType;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: PlanFeaturesDto;
  active: boolean;
  createdAt: Date;
}
