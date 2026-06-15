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
  BadRequestException,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { Response } from 'express';
import { OrganizationService } from '../services/organization.service';
import { WorkspaceService } from '../services/workspace.service';
import { InvitationService } from '../services/invitation.service';
import { ActivityService } from '../services/activity.service';
import { PresenceService } from '../services/presence.service';
import { SharedResourceService } from '../services/shared-resource.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteUserDto,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  UpdateMembershipDto,
  ShareResourceDto,
} from '../dto/organization.dto';
import { GetActivityFeedDto } from '../dto/activity.dto';

@Controller('org')
@UseGuards(AuthGuard('jwt'))
export class OrganizationController {
  constructor(
    private organizationService: OrganizationService,
    private workspaceService: WorkspaceService,
    private invitationService: InvitationService,
    private activityService: ActivityService,
    private presenceService: PresenceService,
    private sharedResourceService: SharedResourceService,
  ) {}

  // ==================== ORGANIZATIONS ====================

  @Post('create')
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: any,
  ) {
    return this.organizationService.createOrganization(user.id, dto);
  }

  @Get()
  async getUserOrganizations(@CurrentUser() user: any) {
    return this.organizationService.getUserOrganizations(user.id);
  }

  @Get(':id')
  async getOrganization(@Param('id') id: string) {
    return this.organizationService.getOrganization(id);
  }

  @Put(':id')
  async updateOrganization(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: any,
  ) {
    return this.organizationService.updateOrganization(id, user.id, dto);
  }

  // ==================== MEMBERS ====================

  @Get(':id/members')
  async getMembers(
    @Param('id') organizationId: string,
    @CurrentUser() user: any,
  ) {
    return this.organizationService.getMembers(organizationId, user.id);
  }

  @Post(':id/members')
  async addMember(
    @Param('id') organizationId: string,
    @Body() dto: { userId: string; role: string },
    @CurrentUser() user: any,
  ) {
    return this.organizationService.addMember(organizationId, user.id, dto.userId, dto.role as any);
  }

  @Put(':id/members/:memberId/role')
  async updateMemberRole(
    @Param('id') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMembershipDto,
    @CurrentUser() user: any,
  ) {
    return this.organizationService.updateMemberRole(organizationId, user.id, memberId, dto.role);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(204)
  async removeMember(
    @Param('id') organizationId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    await this.organizationService.removeMember(organizationId, user.id, memberId);
  }

  // ==================== INVITATIONS ====================

  @Post(':id/invite')
  async inviteUser(
    @Param('id') organizationId: string,
    @Body() dto: InviteUserDto,
    @CurrentUser() user: any,
  ) {
    return this.invitationService.inviteUser(organizationId, user.id, dto);
  }

  @Get(':id/invitations')
  async getInvitations(
    @Param('id') organizationId: string,
    @CurrentUser() user: any,
  ) {
    return this.invitationService.getOrganizationInvitations(organizationId, user.id);
  }

  @Delete(':id/invitations/:invitationId'
  @HttpCode(204)
  async cancelInvitation(
    @Param('id') organizationId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    await this.invitationService.cancelInvitation(invitationId, user.id);
  }

  // ==================== WORKSPACES ====================

  @Post(':id/workspace')
  async createWorkspace(
    @Param('id') organizationId: string,
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser() user: any,
  ) {
    return this.workspaceService.createWorkspace(organizationId, user.id, dto);
  }

  @Get(':id/workspaces')
  async getOrganizationWorkspaces(
    @Param('id') organizationId: string,
    @CurrentUser() user: any,
  ) {
    return this.workspaceService.getOrganizationWorkspaces(organizationId, user.id);
  }

  @Get('workspace/:workspaceId')
  async getWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
  ) {
    return this.workspaceService.getWorkspace(workspaceId, user.id);
  }

  @Put('workspace/:workspaceId')
  async updateWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() user: any,
  ) {
    return this.workspaceService.updateWorkspace(workspaceId, user.id, dto);
  }

  @Delete('workspace/:workspaceId')
  @HttpCode(204)
  async deleteWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
  ) {
    await this.workspaceService.deleteWorkspace(workspaceId, user.id);
  }

  // ==================== ACTIVITY ====================

  @Get(':id/activity/feed')
  async getActivityFeed(
    @Param('id') organizationId: string,
    @CurrentUser() user: any,
    query?: GetActivityFeedDto,
  ) {
    return this.activityService.getActivityFeed(organizationId, query || {});
  }

  @Get(':id/activity/stats')
  async getActivityStats(
    @Param('id') organizationId: string,
    @CurrentUser() user: any,
  ) {
    return this.activityService.getOrganizationStats(organizationId);
  }

  // ==================== PRESENCE ====================

  @Get(':id/presence')
  async getPresences(
    @Param('id') organizationId: string,
    @CurrentUser() user: any,
  ) {
    return this.presenceService.getPresences(organizationId);
  }

  // ==================== SHARED RESOURCES ====================

  @Post('workspace/:workspaceId/share')
  async shareResource(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ShareResourceDto,
    @CurrentUser() user: any,
  ) {
    // Get workspace to get organization ID
    const workspace = await (this as any).workspaceService.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new BadRequestException('Workspace not found');
    }

    return this.sharedResourceService.shareResource(
      workspace.organizationId,
      user.id,
      workspaceId,
      dto,
    );
  }

  @Get('workspace/:workspaceId/shared-resources')
  async getSharedResources(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
  ) {
    const workspace = await (this as any).workspaceService.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new BadRequestException('Workspace not found');
    }

    return this.sharedResourceService.getSharedResources(
      workspace.organizationId,
      user.id,
      workspaceId,
    );
  }

  @Delete('shared-resource/:id')
  @HttpCode(204)
  async unshareResource(
    @Param('id') resourceId: string,
    @CurrentUser() user: any,
  ) {
    const resource = await (this as any).sharedResourceService.prisma.sharedResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new BadRequestException('Resource not found');
    }

    await this.sharedResourceService.unshareResource(
      resource.organizationId,
      user.id,
      resourceId,
    );
  }
}
