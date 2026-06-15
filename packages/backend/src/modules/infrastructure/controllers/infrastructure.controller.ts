import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ClusterService } from '../services/cluster.service';
import { DeploymentService } from '../services/deployment.service';
import { ScalingService } from '../services/scaling.service';
import { LoadBalancerService } from '../services/load-balancer.service';
import {
  CreateClusterDto,
  ScaleClusterDto,
  CreateScalingPolicyDto,
  DeployGloballyDto,
  DeployCanaryDto,
  CreateLoadBalancerRuleDto,
} from '../dto/infrastructure.dto';

@Controller('infra')
@UseGuards(AuthGuard('jwt'))
export class InfrastructureController {
  constructor(
    private clusterService: ClusterService,
    private deploymentService: DeploymentService,
    private scalingService: ScalingService,
    private loadBalancerService: LoadBalancerService,
  ) {}

  // ==================== CLUSTERS ====================

  @Post('cluster/create')
  async createCluster(
    @Body() dto: CreateClusterDto,
    @CurrentUser() user: any,
  ) {
    return this.clusterService.createCluster(user.organizationId, user.id, dto);
  }

  @Get('clusters')
  async getClusters(@CurrentUser() user: any) {
    return this.clusterService.getOrganizationClusters(user.organizationId);
  }

  @Get('cluster/:id')
  async getCluster(@Param('id') id: string) {
    return this.clusterService.getCluster(id);
  }

  @Get('cluster/:id/health')
  async getClusterHealth(@Param('id') id: string) {
    return this.clusterService.getClusterHealth(id);
  }

  @Post('cluster/:id/scale')
  async scaleCluster(
    @Param('id') id: string,
    @Body() dto: ScaleClusterDto,
    @CurrentUser() user: any,
  ) {
    return this.clusterService.scaleCluster(id, user.id, dto);
  }

  @Delete('cluster/:id')
  @HttpCode(204)
  async deleteCluster(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.clusterService.deleteCluster(id, user.id);
  }

  // ==================== SCALING ====================

  @Post('scaling-policy/create')
  async createScalingPolicy(
    @Body() dto: CreateScalingPolicyDto,
    @CurrentUser() user: any,
  ) {
    // Extract clusterId from body
    const { clusterId, ...policyDto } = dto as any;
    return this.scalingService.createScalingPolicy(clusterId, user.id, policyDto);
  }

  @Get('cluster/:id/scaling-policies')
  async getScalingPolicies(@Param('id') id: string) {
    return this.scalingService.getClusterScalingPolicies(id);
  }

  @Post('cluster/:id/evaluate-scaling')
  async evaluateScaling(@Param('id') id: string) {
    await this.scalingService.evaluateScalingPolicies(id);
    return { message: 'Scaling policies evaluated' };
  }

  // ==================== DEPLOYMENTS ====================

  @Post('deploy/global')
  async deployGlobally(
    @Body() dto: DeployGloballyDto,
    @CurrentUser() user: any,
  ) {
    return this.deploymentService.deployGlobally(user.organizationId, user.id, dto);
  }

  @Post('deploy/:id/canary')
  async deployCanary(
    @Param('id') deploymentId: string,
    @Body() dto: DeployCanaryDto,
    @CurrentUser() user: any,
  ) {
    return this.deploymentService.deployCanary(deploymentId, user.id, dto);
  }

  @Post('deploy/:id/rollback')
  async rollback(
    @Param('id') deploymentId: string,
    @CurrentUser() user: any,
  ) {
    return this.deploymentService.rollback(deploymentId, user.id);
  }

  @Get('deploy/:id/status')
  async getDeploymentStatus(@Param('id') deploymentId: string) {
    return this.deploymentService.getDeploymentStatus(deploymentId);
  }

  @Get('app/:appId/deployments')
  async getDeploymentHistory(
    @Param('appId') appId: string,
  ) {
    return this.deploymentService.getDeploymentHistory(appId);
  }

  // ==================== LOAD BALANCER ====================

  @Post('load-balancer/rule')
  async createLoadBalancerRule(
    @Body() dto: CreateLoadBalancerRuleDto,
    @CurrentUser() user: any,
  ) {
    return this.loadBalancerService.createRule(user.id, dto);
  }

  @Get('app/:appId/load-balancer/rules')
  async getLoadBalancerRules(@Param('appId') appId: string) {
    return this.loadBalancerService.getRules(appId);
  }

  @Put('load-balancer/rule/:id')
  async updateLoadBalancerRule(
    @Param('id') ruleId: string,
    @Body() data: any,
  ) {
    return this.loadBalancerService.updateRule(ruleId, data);
  }

  @Delete('load-balancer/rule/:id')
  @HttpCode(204)
  async deleteLoadBalancerRule(@Param('id') ruleId: string) {
    await this.loadBalancerService.deleteRule(ruleId);
  }

  @Get('load-balancer/rule/:id/health')
  async getLoadBalancerHealth(@Param('id') ruleId: string) {
    return this.loadBalancerService.getHealthStatus(ruleId);
  }
}
