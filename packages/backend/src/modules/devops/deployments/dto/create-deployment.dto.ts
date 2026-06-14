import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { Environment, DeploymentTarget } from '@prisma/client';

export class CreateDeploymentDto {
  @IsString()
  projectId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(Environment)
  environment: Environment;

  @IsEnum(DeploymentTarget)
  targetType: DeploymentTarget;

  @IsOptional()
  @IsString()
  appId?: string;

  @IsOptional()
  @IsString()
  pipelineId?: string;

  @IsObject()
  targetConfig: Record<string, any>;
}

export class RunDeploymentDto {
  @IsOptional()
  @IsObject()
  overrideConfig?: Record<string, any>;

  @IsOptional()
  @IsString()
  triggerReason?: string;
}

export class RollbackDeploymentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class DeploymentResponseDto {
  id: string;
  name: string;
  status: string;
  environment: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  healthStatus: string;
  canRollback: boolean;
}