import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '@/modules/auth/entities/user.entity';
import { Organization } from '@/modules/collaboration/entities/organization.entity';
import { Deployment } from '@/modules/deployment/entities/deployment.entity';

export enum CloudProvider {
  AWS = 'AWS',
  GCP = 'GCP',
  AZURE = 'AZURE',
  DO = 'DIGITALOCEAN',
}

export enum Region {
  US_EAST = 'us-east-1',
  US_WEST = 'us-west-2',
  EU_WEST = 'eu-west-1',
  EU_CENTRAL = 'eu-central-1',
  ASIA_SOUTHEAST = 'ap-southeast-1',
  ASIA_NORTHEAST = 'ap-northeast-1',
}

export enum ClusterStatus {
  CREATING = 'CREATING',
  ACTIVE = 'ACTIVE',
  DEGRADED = 'DEGRADED',
  FAILED = 'FAILED',
  SCALING = 'SCALING',
  DESTROYING = 'DESTROYING',
}

export enum NodeStatus {
  HEALTHY = 'HEALTHY',
  UNHEALTHY = 'UNHEALTHY',
  CORDONED = 'CORDONED',
  TERMINATING = 'TERMINATING',
}

export enum DeploymentStatus {
  PENDING = 'PENDING',
  BUILDING = 'BUILDING',
  TESTING = 'TESTING',
  DEPLOYING = 'DEPLOYING',
  LIVE = 'LIVE',
  CANARY = 'CANARY',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export enum ScalingStrategy {
  MANUAL = 'MANUAL',
  CPU_BASED = 'CPU_BASED',
  MEMORY_BASED = 'MEMORY_BASED',
  QUEUE_BASED = 'QUEUE_BASED',
  PREDICTIVE = 'PREDICTIVE',
}

@Entity('infrastructure_clusters')
export class InfrastructureCluster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  region: string; // Region enum

  @Column()
  cloudProvider: string; // CloudProvider enum

  @ManyToOne(() => Organization, { eager: true })
  organization: Organization;

  @Column()
  organizationId: string;

  @Column()
  kubernetesVersion: string;

  @Column()
  nodeCount: number;

  @Column()
  nodeType: string; // e.g., t3.xlarge

  @Column({ type: 'jsonb' })
  networkConfig: {
    vpcId: string;
    subnets: string[];
    securityGroups: string[];
    cidr: string;
  };

  @Column()
  status: string; // ClusterStatus enum

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  kubernetesClusterId: string; // EKS/GKE cluster ID

  @Column({ nullable: true })
  createdBy: string;

  @OneToMany(() => ServiceInstance, (instance) => instance.cluster, { cascade: true })
  services: ServiceInstance[];

  @OneToMany(() => ScalingPolicy, (policy) => policy.cluster, { cascade: true })
  scalingPolicies: ScalingPolicy[];

  @OneToMany(() => InfraConfig, (config) => config.cluster, { cascade: true })
  configs: InfraConfig[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @@index([region])
  @@index([organizationId])
  @@index([status])
}

@Entity('service_instances')
export class ServiceInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  serviceName: string;

  @Column()
  clusterName: string;

  @ManyToOne(() => InfrastructureCluster, (cluster) => cluster.services, { onDelete: 'CASCADE' })
  cluster: InfrastructureCluster;

  @Column()
  clusterId: string;

  @Column({ type: 'enum', enum: NodeStatus })
  status: NodeStatus;

  @Column()
  replicas: number;

  @Column()
  desiredReplicas: number;

  @Column({ type: 'jsonb' })
  containerConfig: {
    image: string;
    port: number;
    env: Record<string, string>;
    resources: {
      cpu: string;
      memory: string;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  healthCheck: {
    enabled: boolean;
    path?: string;
    intervalSeconds?: number;
    timeoutSeconds?: number;
  };

  @Column({ nullable: true })
  kubernetesDeploymentId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @@unique([clusterId, serviceName])
  @@index([clusterId])
  @@index([status])
}

@Entity('scaling_policies')
export class ScalingPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => InfrastructureCluster, (cluster) => cluster.scalingPolicies, {
    onDelete: 'CASCADE',
  })
  cluster: InfrastructureCluster;

  @Column()
  clusterId: string;

  @Column()
  strategy: string; // ScalingStrategy enum

  @Column()
  targetService: string;

  @Column()
  minReplicas: number;

  @Column()
  maxReplicas: number;

  @Column({ type: 'jsonb' })
  rules: Array<{
    metric: string; // cpu, memory, queue_depth
    threshold: number;
    operator: 'greater_than' | 'less_than' | 'equals';
    action: 'scale_up' | 'scale_down';
    scaleBy: number;
    cooldownSeconds: number;
  }>;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @@index([clusterId])
  @@index([targetService])
}

@Entity('infra_configs')
export class InfraConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  environment: string; // staging, production

  @ManyToOne(() => InfrastructureCluster, (cluster) => cluster.configs, { onDelete: 'CASCADE' })
  cluster: InfrastructureCluster;

  @Column()
  clusterId: string;

  @Column({ type: 'jsonb' })
  iaC: {
    version: string;
    provider: string; // terraform, cloudformation
    modules: Array<{
      name: string;
      source: string;
      variables: Record<string, any>;
    }>;
  };

  @Column({ type: 'jsonb' })
  secrets: Record<string, string>; // Encrypted secrets

  @Column({ type: 'jsonb' })
  environmentVariables: Record<string, string>;

  @Column({ nullable: true })
  lastDeployedBy: string;

  @Column({ nullable: true })
  lastDeployedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @@unique([clusterId, environment])
  @@index([clusterId])
}

@Entity('deployment_pipelines')
export class DeploymentPipeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  appId: string;

  @ManyToOne(() => Organization)
  organization: Organization;

  @Column()
  organizationId: string;

  @Column()
  gitBranch: string;

  @Column({ type: 'jsonb' })
  stages: Array<{
    name: string;
    type: 'build' | 'test' | 'security_scan' | 'deploy';
    config: Record<string, any>;
  }>;

  @Column({ default: true })
  enabled: boolean;

  @Column({ nullable: true })
  webhookUrl: string;

  @Column({ nullable: true })
  webhookSecret: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => Deployment, (d) => d.pipeline, { cascade: true })
  deployments: Deployment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @@index([appId])
  @@index([organizationId])
}

@Entity('load_balancer_rules')
export class LoadBalancerRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  appId: string;

  @Column({ type: 'jsonb' })
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
      weight?: number; // For canary deployments
    }>;
  }>;

  @Column({ type: 'jsonb' })
  healthCheck: {
    enabled: boolean;
    path: string;
    intervalSeconds: number;
    timeoutSeconds: number;
    healthyThreshold: number;
    unhealthyThreshold: number;
  };

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @@index([appId])
}

@Entity('deployment_regions')
export class DeploymentRegion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  deploymentId: string;

  @ManyToOne(() => Deployment, (d) => d.regions, { onDelete: 'CASCADE' })
  deployment: Deployment;

  @Column()
  region: string; // Region enum

  @Column()
  status: string; // DeploymentStatus enum

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  clusterId: string;

  @Column({ nullable: true })
  deployedAt: Date;

  @Column({ nullable: true })
  failedAt: Date;

  @Column({ nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @@unique([deploymentId, region])
  @@index([deploymentId])
  @@index([region])
  @@index([status])
}
