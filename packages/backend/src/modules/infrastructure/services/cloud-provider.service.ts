import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class CloudProviderService {
  private readonly logger = new Logger(CloudProviderService.name);
  private awsClients = new Map<string, any>();

  constructor(private configService: ConfigService) {
    this.initializeClients();
  }

  private initializeClients(): void {
    // Initialize AWS SDK for each region
    const regions = [
      'us-east-1',
      'us-west-2',
      'eu-west-1',
      'eu-central-1',
      'ap-southeast-1',
      'ap-northeast-1',
    ];

    for (const region of regions) {
      const eks = new AWS.EKS({ region });
      this.awsClients.set(`eks-${region}`, eks);
    }
  }

  async createEKSCluster(
    clusterName: string,
    region: string,
    config: any,
  ): Promise<any> {
    this.logger.log(`Creating EKS cluster: ${clusterName} in region: ${region}`);

    const eks = this.awsClients.get(`eks-${region}`);

    const params = {
      name: clusterName,
      version: config.kubernetesVersion,
      roleArn: config.roleArn,
      resourcesVpcConfig: {
        subnetIds: config.networkConfig.subnets,
        securityGroupIds: config.networkConfig.securityGroups,
      },
      logging: {
        clusterLogging: [
          {
            enabled: true,
            types: ['api', 'audit', 'authenticator', 'controllerManager', 'scheduler'],
          },
        ],
      },
    };

    try {
      const result = await eks.createCluster(params).promise();
      return result.cluster;
    } catch (error: any) {
      this.logger.error(`EKS cluster creation failed: ${error.message}`);
      throw error;
    }
  }

  async createNodeGroup(
    clusterName: string,
    region: string,
    config: any,
  ): Promise<any> {
    this.logger.log(`Creating node group for cluster: ${clusterName}`);

    const eks = this.awsClients.get(`eks-${region}`);

    const params = {
      clusterName,
      nodegroupName: `${clusterName}-ng-1`,
      subnets: config.networkConfig.subnets,
      nodeRole: config.nodeRoleArn,
      scalingConfig: {
        minSize: 1,
        maxSize: config.nodeCount || 3,
        desiredSize: config.nodeCount || 2,
      },
      instanceTypes: [config.nodeType],
      amiType: 'AL2_x86_64',
    };

    try {
      const result = await eks.createNodegroup(params).promise();
      return result.nodegroup;
    } catch (error: any) {
      this.logger.error(`Node group creation failed: ${error.message}`);
      throw error;
    }
  }

  async scaleNodeGroup(
    clusterName: string,
    region: string,
    desiredSize: number,
  ): Promise<any> {
    this.logger.log(
      `Scaling node group in cluster: ${clusterName} to ${desiredSize} nodes`,
    );

    const eks = this.awsClients.get(`eks-${region}`);

    const params = {
      clusterName,
      nodegroupName: `${clusterName}-ng-1`,
      scalingConfig: {
        desiredSize,
      },
    };

    try {
      const result = await eks.updateNodegroupConfig(params).promise();
      return result.nodegroup;
    } catch (error: any) {
      this.logger.error(`Node group scaling failed: ${error.message}`);
      throw error;
    }
  }

  async deleteEKSCluster(clusterName: string, region: string): Promise<void> {
    this.logger.log(`Deleting EKS cluster: ${clusterName}`);

    const eks = this.awsClients.get(`eks-${region}`);

    try {
      // Delete node group first
      await eks
        .deleteNodegroup({
          clusterName,
          nodegroupName: `${clusterName}-ng-1`,
        })
        .promise();

      // Wait for node group deletion
      await eks
        .waitFor('nodegroupDeleted', {
          clusterName,
          nodegroupName: `${clusterName}-ng-1`,
        })
        .promise();

      // Delete cluster
      await eks.deleteCluster({ name: clusterName }).promise();
    } catch (error: any) {
      this.logger.error(`EKS cluster deletion failed: ${error.message}`);
      throw error;
    }
  }

  async getClusterStatus(clusterName: string, region: string): Promise<any> {
    const eks = this.awsClients.get(`eks-${region}`);

    try {
      const result = await eks.describeCluster({ name: clusterName }).promise();
      return result.cluster;
    } catch (error: any) {
      this.logger.error(`Get cluster status failed: ${error.message}`);
      throw error;
    }
  }

  async createLoadBalancer(
    name: string,
    region: string,
    config: any,
  ): Promise<any> {
    this.logger.log(`Creating load balancer: ${name}`);

    const elbv2 = new AWS.ELBv2({ region });

    const params = {
      Name: name,
      Subnets: config.subnets,
      SecurityGroups: config.securityGroups,
      Scheme: config.scheme || 'internet-facing',
      Type: 'application',
      IpAddressType: 'ipv4',
      Tags: [{ Key: 'Name', Value: name }],
    };

    try {
      const result = await elbv2.createLoadBalancer(params).promise();
      return result.LoadBalancers?.[0];
    } catch (error: any) {
      this.logger.error(`Load balancer creation failed: ${error.message}`);
      throw error;
    }
  }
}
