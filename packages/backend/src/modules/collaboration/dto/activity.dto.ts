import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export class LogActivityDto {
  @IsString()
  action: string;

  @IsString()
  resourceType: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  resourceName?: string;

  @IsOptional()
  @IsObject()
  changes?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class GetActivityFeedDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;
}

export class ActivityLogResponseDto {
  id: string;
  action: string;
  resourceType: string;
  resourceName?: string;
  user: any;
  changes?: Record<string, any>;
  timestamp: Date;
}
