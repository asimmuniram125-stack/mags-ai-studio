import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { ShareResourceDto } from '../dto/organization.dto';
import { OrganizationRole } from '../entities/organization.entity';

@Injectable()
export class SharedResourceService {
  private readonly logger = new Logger(SharedResourceService.name);

  constructor(private prisma: PrismaService) {}

  async shareResource(
    organizationId: string,
    userId: string,
    workspaceId: string,
    dto: ShareResourceDto,
  ): Promise<any> {
    this.logger.log(
      `Sharing resource ${dto.resourceType}:${dto.resourceId} to workspace ${workspaceId}`,
    );

    // Check access
    await this.checkWorkspaceAccess(organizationId, userId, workspaceId);

    // Check if already shared
    const existing = await this.prisma.sharedResource.findUnique({
      where: {
        resourceType_resourceId_workspaceId: {
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          workspaceId,
        },
      },
    });

    if (existing) {
      // Update permissions
      return this.prisma.sharedResource.update({
        where: { id: existing.id },
        data: { permissions: dto.permissions },
      });
    }

    // Create new shared resource
    return this.prisma.sharedResource.create({
      data: {
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        organizationId,
        workspaceId,
        sharedBy: userId,
        permissions: dto.permissions,
        metadata: {},
      },
    });
  }

  async unshareResource(
    organizationId: string,
    userId: string,
    resourceId: string,
  ): Promise<void> {
    const resource = await this.prisma.sharedResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Shared resource not found');
    }

    // Check permission
    if (resource.sharedBy !== userId) {
      const membership = await this.prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
      });

      if (!membership || ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(membership.role)) {
        throw new BadRequestException('Insufficient permissions');
      }
    }

    await this.prisma.sharedResource.delete({
      where: { id: resourceId },
    });
  }

  async getSharedResources(
    organizationId: string,
    userId: string,
    workspaceId?: string,
  ): Promise<any[]> {
    if (workspaceId) {
      await this.checkWorkspaceAccess(organizationId, userId, workspaceId);
    }

    return this.prisma.sharedResource.findMany({
      where: {
        organizationId,
        ...(workspaceId && { workspaceId }),
        active: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserAccessibleResources(
    organizationId: string,
    userId: string,
    resourceType: string,
  ): Promise<any[]> {
    // Get all workspaces user has access to
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId, userId, active: true },
    });

    if (memberships.length === 0) {
      return [];
    }

    // Get all shared resources in organization
    const sharedResources = await this.prisma.sharedResource.findMany({
      where: {
        organizationId,
        resourceType,
        active: true,
      },
    });

    // Filter by workspace access
    const userWorkspaces = await this.prisma.workspace.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const workspaceIds = userWorkspaces.map((w) => w.id);

    return sharedResources.filter((r) => workspaceIds.includes(r.workspaceId));
  }

  private async checkWorkspaceAccess(
    organizationId: string,
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.organizationId !== organizationId) {
      throw new NotFoundException('Workspace not found');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!membership || !membership.active) {
      throw new BadRequestException('Access denied');
    }
  }
}
