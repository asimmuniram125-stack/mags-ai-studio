import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { UpdatePresenceDto } from '../dto/presence.dto';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(private prisma: PrismaService) {}

  async updatePresence(
    organizationId: string,
    userId: string,
    sessionId: string,
    dto: UpdatePresenceDto,
  ): Promise<any> {
    const now = new Date();

    const presence = await this.prisma.presence.upsert({
      where: {
        userId_organizationId_sessionId: {
          userId,
          organizationId,
          sessionId,
        },
      },
      update: {
        status: dto.status,
        currentResource: dto.currentResource,
        lastActivityAt: now,
        updatedAt: now,
      },
      create: {
        userId,
        organizationId,
        sessionId,
        status: dto.status,
        currentResource: dto.currentResource,
        lastActivityAt: now,
      },
      include: { user: true },
    });

    return presence;
  }

  async getPresences(organizationId: string, workspaceId?: string): Promise<any[]> {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    return this.prisma.presence.findMany({
      where: {
        organizationId,
        ...(workspaceId && { workspaceId }),
        status: { not: 'OFFLINE' },
        lastActivityAt: { gte: twoMinutesAgo },
      },
      include: { user: true },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async getUserPresence(organizationId: string, userId: string): Promise<any | null> {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    return this.prisma.presence.findFirst({
      where: {
        organizationId,
        userId,
        lastActivityAt: { gte: twoMinutesAgo },
      },
      include: { user: true },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async setOffline(userId: string, organizationId: string, sessionId: string): Promise<void> {
    await this.prisma.presence.updateMany({
      where: { userId, organizationId, sessionId },
      data: { status: 'OFFLINE' },
    });
  }

  async setOfflineForUser(userId: string, organizationId: string): Promise<void> {
    await this.prisma.presence.updateMany({
      where: { userId, organizationId },
      data: { status: 'OFFLINE' },
    });
  }
}
