import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from '../dto/organization.dto';
import { OrganizationRole } from '../entities/organization.entity';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(private prisma: PrismaService) {}

  async createWorkspace(
    organizationId: string,
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<any> {
    this.logger.log(`Creating workspace: ${dto.name} in organization: ${organizationId}`);

    // Check permission
    await this.checkWorkspacePermission(organizationId, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    const workspace = await this.prisma.workspace.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        creatorId: userId,
        settings: dto.settings || {},
      },
      include: {
        organization: true,
        creator: true,
      },
    });

    return workspace;
  }

  async getWorkspace(id: string, userId: string): Promise<any> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        organization: true,
        creator: true,
        projects: { orderBy: { order: 'asc' } },
        sharedResources: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace not found: ${id}`);
    }

    // Check access
    await this.checkWorkspacePermission(workspace.organizationId, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.MEMBER,
      OrganizationRole.VIEWER,
    ]);

    return workspace;
  }

  async getOrganizationWorkspaces(organizationId: string, userId: string): Promise<any[]> {
    // Check access
    await this.checkWorkspacePermission(organizationId, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.MEMBER,
      OrganizationRole.VIEWER,
    ]);

    return this.prisma.workspace.findMany({
      where: { organizationId, active: true },
      include: { creator: true, projects: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateWorkspace(
    id: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<any> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace not found: ${id}`);
    }

    // Check permission
    await this.checkWorkspacePermission(workspace.organizationId, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    return this.prisma.workspace.update({
      where: { id },
      data: dto,
      include: { organization: true, projects: true },
    });
  }

  async deleteWorkspace(id: string, userId: string): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace not found: ${id}`);
    }

    // Check permission
    await this.checkWorkspacePermission(workspace.organizationId, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    await this.prisma.workspace.update({
      where: { id },
      data: { active: false },
    });
  }

  private async checkWorkspacePermission(
    organizationId: string,
    userId: string,
    requiredRoles: OrganizationRole[],
  ): Promise<boolean> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!membership || !membership.active || !requiredRoles.includes(membership.role)) {
      throw new BadRequestException('Insufficient permissions');
    }

    return true;
  }
}
