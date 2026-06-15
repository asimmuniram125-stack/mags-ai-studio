import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { InviteUserDto, AcceptInvitationDto } from '../dto/organization.dto';
import { OrganizationRole } from '../entities/organization.entity';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('collaboration') private collaborationQueue: Queue,
  ) {}

  async inviteUser(
    organizationId: string,
    userId: string,
    dto: InviteUserDto,
  ): Promise<any> {
    this.logger.log(`Inviting user ${dto.email} to organization: ${organizationId}`);

    // Check permission
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

    // Check if user already invited or is member
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        organizationId,
        email: dto.email,
        expired: false,
      },
    });

    if (existingInvitation && !existingInvitation.accepted) {
      throw new BadRequestException('User already invited');
    }

    const existingMember = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        user: { email: dto.email },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member');
    }

    // Generate invitation token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        organizationId,
        invitedById: userId,
        role: dto.role,
        token,
        expiresAt,
        accepted: false,
        expired: false,
      },
      include: {
        invitedBy: true,
        organization: true,
      },
    });

    // Queue invitation email
    await this.collaborationQueue.add(
      'send-invitation-email',
      {
        invitationId: invitation.id,
        email: dto.email,
        organizationName: invitation.organization.name,
        invitedBy: invitation.invitedBy.email,
        token,
        message: dto.message,
      },
      { removeOnComplete: true },
    );

    return invitation;
  }

  async acceptInvitation(dto: AcceptInvitationDto, userId: string): Promise<any> {
    this.logger.log(`Accepting invitation with token: ${dto.token}`);

    const invitation = await this.prisma.invitation.findFirst({
      where: { token: dto.token },
      include: { organization: true, invitedBy: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.accepted) {
      throw new BadRequestException('Invitation already accepted');
    }

    if (invitation.expired || new Date() > invitation.expiresAt) {
      throw new BadRequestException('Invitation has expired');
    }

    // Create membership
    const membership = await this.prisma.membership.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        joinedAt: new Date(),
        active: true,
        invitedBy: invitation.invitedById,
      },
      include: { user: true },
    });

    // Mark invitation as accepted
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        accepted: true,
        acceptedAt: new Date(),
        acceptedBy: userId,
      },
    });

    // Queue acceptance event
    await this.collaborationQueue.add(
      'invitation-accepted',
      {
        organizationId: invitation.organizationId,
        userId,
        invitedBy: invitation.invitedById,
      },
      { removeOnComplete: true },
    );

    return membership;
  }

  async getOrganizationInvitations(organizationId: string, userId: string): Promise<any[]> {
    // Check permission
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

    return this.prisma.invitation.findMany({
      where: { organizationId, expired: false },
      include: { invitedBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Check permission
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId,
        },
      },
    });

    if (!membership || ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(membership.role)) {
      throw new BadRequestException('Insufficient permissions');
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { expired: true },
    });
  }
}
