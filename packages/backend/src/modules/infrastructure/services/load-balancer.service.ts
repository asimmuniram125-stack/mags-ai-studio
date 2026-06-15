import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateLoadBalancerRuleDto } from '../dto/infrastructure.dto';
import { CloudProviderService } from './cloud-provider.service';

@Injectable()
export class LoadBalancerService {
  private readonly logger = new Logger(LoadBalancerService.name);

  constructor(
    private prisma: PrismaService,
    private cloudProviderService: CloudProviderService,
  ) {}

  async createRule(userId: string, dto: CreateLoadBalancerRuleDto): Promise<any> {
    this.logger.log(`Creating load balancer rule: ${dto.name}`);

    const rule = await this.prisma.loadBalancerRule.create({
      data: {
        name: dto.name,
        appId: dto.appId,
        rules: dto.rules,
        healthCheck: dto.healthCheck,
        active: true,
      },
    });

    // Deploy rule to regions
    for (const ruleConfig of dto.rules) {
      for (const action of ruleConfig.actions) {
        if (action.target) {
          // TODO: Deploy to cloud provider
          await this.deployRuleToRegion(
            dto.appId,
            action.target.region,
            ruleConfig,
          );
        }
      }
    }

    return rule;
  }

  async getRules(appId: string): Promise<any[]> {
    return this.prisma.loadBalancerRule.findMany({
      where: { appId, active: true },
    });
  }

  async updateRule(ruleId: string, data: any): Promise<any> {
    this.logger.log(`Updating load balancer rule: ${ruleId}`);

    const rule = await this.prisma.loadBalancerRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException(`Rule not found: ${ruleId}`);
    }

    const updated = await this.prisma.loadBalancerRule.update({
      where: { id: ruleId },
      data,
    });

    return updated;
  }

  async deleteRule(ruleId: string): Promise<void> {
    const rule = await this.prisma.loadBalancerRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException(`Rule not found: ${ruleId}`);
    }

    await this.prisma.loadBalancerRule.update({
      where: { id: ruleId },
      data: { active: false },
    });
  }

  private async deployRuleToRegion(
    appId: string,
    region: string,
    rule: any,
  ): Promise<void> {
    // TODO: Deploy to cloud provider
    this.logger.log(`Deploying rule to region: ${region}`);
  }

  async getHealthStatus(ruleId: string): Promise<any> {
    const rule = await this.prisma.loadBalancerRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException(`Rule not found: ${ruleId}`);
    }

    // TODO: Get health status from cloud provider
    return {
      ruleId,
      healthy: true,
      targets: [],
    };
  }
}
