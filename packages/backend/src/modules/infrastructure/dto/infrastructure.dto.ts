import { IsString, IsNumber, IsEnum, IsObject, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { Region, CloudProvider, ScalingStrategy, DeploymentStatus } from '../entities/infrastructure.entity';

export class CreateClusterDto {
  @IsString()
  name: string;

  @IsEnum(Region)
  region: Region;

  @IsEnum(CloudProvider)
  cloudProvider: CloudProvider;

  @IsString()
  kubernetesVersion: string;

  @IsNumber()
  nodeCount: number;

  @IsString()
  nodeType: string;

  @IsObject()
  networkConfig: {
    vpcId: string;
    subnets: string[];
    securityGroups: string[];
    cidr: string;
  };
}

export class ScaleClusterDto {
  @IsNumber()
  desiredNodeCount: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateScalingPolicyDto {
  @IsString()
  name: string;

  @IsEnum(ScalingStrategy)
  strategy: ScalingStrategy;

  @IsString()
  targetService: string;

  @IsNumber()
  minReplicas: number;

  @IsNumber()
  maxReplicas: number;

  @IsArray()
  rules: Array<{
    metric: string;
    threshold: number;
    operator: 'greater_than' | 'less_than' | 'equals';
    action: 'scale_up' | 'scale_down';
    scaleBy: number;
    cooldownSeconds: number;
  }>;
}

export class CreateDeploymentPipelineDto {
  @IsString()
  name: string;

  @IsString()
  appId: string;

  @IsString()
  gitBranch: string;

  @IsArray()
  stages: Array<{
    name: string;
    type: 'build' | 'test' | 'security_scan' | 'deploy';
    config: Record<string, any>;
  }>;
}

export class DeployGloballyDto {
  @IsString()
  appId: string;

  @IsArray()
  @IsEnum(Region, { each: true })
  regions: Region[];

  @IsOptional()
  @IsBoolean()
  canary?: boolean;

  @IsOptional()
  @IsNumber()
  canaryPercentage?: number;

  @IsOptional()
  @IsString()
  tag?: string;
}

export class DeployCanaryDto {
  @IsString()
  deploymentId: string;

  @IsNumber()
  initialPercentage: number; // 5, 10, 25, etc.

  @IsOptional()
  @IsNumber()
  incrmentPercentageEvery?: number; // seconds
}

export class CreateLoadBalancerRuleDto {
  @IsString()
  name: string;

  @IsString()
  appId: string;

  @IsArray()
  rules: Array<{
    priority: number;
    condition: {
      path?: string;
      hostname?: string;
      method?: string;
      header?: { name: string; value: string };
    };
    actions: Array<{
      type: 'forward' | 'redirect' | 'fixed_response';
      target?: {
        region: string;
        service: string;
        port: number;
      };
      weight?: number;
    }>;
  }>;

  @IsObject()
  healthCheck: {
    enabled: boolean;
    path: string;
    intervalSeconds: number;
    timeoutSeconds: number;
    healthyThreshold: number;
    unhealthyThreshold: number;
  };
}

export class ClusterResponseDto {
  id: string;
  name: string;
  region: Region;
  cloudProvider: CloudProvider;
  kubernetesVersion: string;
  nodeCount: number;
  status: string;
  createdAt: Date;
}

export class DeploymentStatusDto {
  deploymentId: string;
  status: DeploymentStatus;
  regions: Array<{
    region: Region;
    status: DeploymentStatus;
    deployedAt: Date;
  }>;
}
