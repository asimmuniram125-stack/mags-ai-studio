import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PipelineStageDto {
  @IsString()
  name: string;

  @IsString()
  type: string; // INSTALL, TEST, BUILD, DEPLOY, etc.

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  config?: Record<string, any>;

  @IsOptional()
  timeout?: number;

  @IsOptional()
  retryCount?: number;

  @IsOptional()
  conditions?: string;
}

export class CreatePipelineDto {
  @IsString()
  projectId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PipelineStageDto)
  stages: PipelineStageDto[];

  @IsOptional()
  isDefault?: boolean;
}

export class ExecutePipelineDto {
  @IsOptional()
  deploymentId?: string;

  @IsOptional()
  @IsString()
  triggerReason?: string;

  @IsOptional()
  overrideVariables?: Record<string, string>;
}