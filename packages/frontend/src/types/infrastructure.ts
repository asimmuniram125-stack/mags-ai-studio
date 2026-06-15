export enum Region {
  US_EAST = 'us-east-1',
  US_WEST = 'us-west-2',
  EU_WEST = 'eu-west-1',
  EU_CENTRAL = 'eu-central-1',
  ASIA_SOUTHEAST = 'ap-southeast-1',
  ASIA_NORTHEAST = 'ap-northeast-1',
}

export enum CloudProvider {
  AWS = 'AWS',
  GCP = 'GCP',
  AZURE = 'AZURE',
  DIGITALOCEAN = 'DIGITALOCEAN',
}

export enum ClusterStatus {
  CREATING = 'CREATING',
  ACTIVE = 'ACTIVE',
  DEGRADED = 'DEGRADED',
  FAILED = 'FAILED',
  SCALING = 'SCALING',
  DESTROYING = 'DESTROYING',
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

export interface Cluster {
  id: string;
  name: string;
  region: Region;
  cloudProvider: CloudProvider;
  kubernetesVersion: string;
  nodeCount: number;
  nodeType: string;
  status: ClusterStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClusterHealth {
  clusterId: string;
  clusterName: string;
  status: ClusterStatus;
  nodeCount: number;
  nodeHealth: Array<{
    name: string;
    status: string;
    cpu: string;
    memory: string;
  }>;
  resourceUtilization: {
    cpuUsage: string;
    memoryUsage: string;
    diskUsage: string;
  };
  services: Array<{
    name: string;
    type: string;
    replicas: number;
  }>;
  timestamp: Date;
}

export interface Deployment {
  id: string;
  appId: string;
  status: DeploymentStatus;
  regions: Array<{
    region: Region;
    status: DeploymentStatus;
    deployedAt?: Date;
  }>;
  deployedAt: Date;
  completedAt?: Date;
  deployedBy: string;
  error?: string;
}

export interface ScalingPolicy {
  id: string;
  name: string;
  strategy: string;
  targetService: string;
  minReplicas: number;
  maxReplicas: number;
  active: boolean;
}

export interface LoadBalancerRule {
  id: string;
  name: string;
  appId: string;
  active: boolean;
  createdAt: Date;
}

export interface InfraMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}
