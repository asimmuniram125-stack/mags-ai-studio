import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { CreateOrganizationDto, UpdateOrganizationDto } from '../dto/organization.dto';
import { OrganizationType, OrganizationRole } from '../entities/organization.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('collaboration') private collaborationQueue: Queue,
  ) {}

  async createOrganization(userId: string, dto: CreateOrganizationDto): Promise<any> {
    this.logger.log(`Creating organization: ${dto.name} for user: ${userId}`);

    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        description: dto.description,
        website: dto.website,
        type: dto.type,
        industry: dto.industry,
        country: dto.country,
        ownerId: userId,
        settings: dto.settings || {},
      },
      include: {
        owner: true,
        members: { include: { user: true } },
      },
    });

    // Add creator as owner member
    await this.prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId,
        role: OrganizationRole.OWNER,
        joinedAt: new Date(),
        active: true,
      },
    });

    // Create default workspace
    await this.prisma.workspace.create({
      data: {
        name: 'General',
        organizationId: organization.id,
        creatorId: userId,
        description: 'Default workspace',
      },
    });

    // Queue organization creation event
    await this.collaborationQueue.add(
      'organization-created',
      { organizationId: organization.id, userId },
      { removeOnComplete: true },
    );

    return organization;
  }

  async getOrganization(id: string): Promise<any> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        owner: true,
        members: { include: { user: true } },
        workspaces: true,
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization not found: ${id}`);
    }

    return organization;
  }

  async getUserOrganizations(userId: string): Promise<any[]> {
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId,
            active: true,
          },
        },
      },
      include: {
        owner: true,
        members: { include: { user: true } },
        workspaces: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOrganization(id: string, userId: string, dto: UpdateOrganizationDto): Promise<any> {
    this.logger.log(`Updating organization: ${id}`);

    // Check permission
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId,
        },
      },
    });

    if (!membership || ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(membership.role)) {
      throw new BadRequestException('Insufficient permissions');
    }

    const organization = await this.prisma.organization.update({
      where: { id },
      data: dto,
      include: { owner: true, members: { include: { user: true } } },
    });

    // Log activity
    await this.logActivity(id, userId, 'UPDATED', 'ORGANIZATION', id, organization.name, {
      before: {},
      after: dto,
    });

    return organization;
  }

  async addMember(
    organizationId: string,
    userId: string,
    newUserId: string,
    role: OrganizationRole,
  ): Promise<any> {
    this.logger.log(`Adding member ${newUserId} to organization: ${organizationId}`);

    // Check permission
    const requesterMembership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!requesterMembership || ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(requesterMembership.role)) {
      throw new BadRequestException('Insufficient permissions');
    }

    // Check if already a member
    const existingMember = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: newUserId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member');
    }

    const membership = await this.prisma.membership.create({
      data: {
        organizationId,
        userId: newUserId,
        role,
        joinedAt: new Date(),
        active: true,
        invitedBy: userId,
      },
      include: { user: true },
    });

    // Log activity
    await this.logActivity(organizationId, userId, 'MEMBER_ADDED', 'MEMBER', newUserId);

    return membership;
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    memberId: string,
    newRole: OrganizationRole,
  ): Promise<any> {
    this.logger.log(`Updating member ${memberId} role in organization: ${organizationId}`);

    // Check permission
    const requesterMembership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!requesterMembership || ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(requesterMembership.role)) {
      throw new BadRequestException('Insufficient permissions');
    }

    const member = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: memberId,
        },
      },
      include: { user: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const oldRole = member.role;

    const updated = await this.prisma.membership.update({
      where: { id: member.id },
      data: { role: newRole },
      include: { user: true },
    });

    // Log activity
    await this.logActivity(organizationId, userId, 'ROLE_UPDATED', 'MEMBER', memberId, undefined, {
      oldRole,
      newRole,
    });

    return updated;
  }

  async removeMember(organizationId: string, userId: string, memberId: string): Promise<void> {
    this.logger.log(`Removing member ${memberId} from organization: ${organizationId}`);

    // Check permission
    const requesterMembership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!requesterMembership || ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(requesterMembership.role)) {
      throw new BadRequestException('Insufficient permissions');
    }

    const member = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: memberId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.prisma.membership.delete({ where: { id: member.id } });

    // Log activity
    await this.logActivity(organizationId, userId, 'MEMBER_REMOVED', 'MEMBER', memberId);
  }

  async getMembers(organizationId: string, userId: string): Promise<any[]> {
    // Check access
    await this.checkMemberAccess(organizationId, userId);

    return this.prisma.membership.findMany({
      where: { organizationId, active: true },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async checkMemberAccess(organizationId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    return !!membership && membership.active;
  }

  async checkPermission(
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

    return !!membership && membership.active && requiredRoles.includes(membership.role);
  }

  private async logActivity(
    organizationId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    resourceName?: string,
    changes?: Record<string, any>,
  ): Promise<void> {
    await this.collaborationQueue.add(
      'activity-log',
      {
        organizationId,
        userId,
        action,
        resourceType,
        resourceId,
        resourceName,
        changes,
      },
      { removeOnComplete: true },
    );
  }
}
