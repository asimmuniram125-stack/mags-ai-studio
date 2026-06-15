import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { GetActivityFeedDto } from '../dto/activity.dto';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private prisma: PrismaService) {}

  async logActivity(
    organizationId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    resourceName?: string,
    changes?: Record<string, any>,
    metadata?: Record<string, any>,
    workspaceId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<any> {
    return this.prisma.activityLog.create({
      data: {
        organizationId,
        workspaceId,
        userId,
        action,
        resourceType,
        resourceId,
        resourceName,
        changes,
        metadata,
        ipAddress,
        userAgent,
      },
    });
  }

  async getActivityFeed(
    organizationId: string,
    dto: GetActivityFeedDto,
  ): Promise<{ logs: any[]; total: number }> {
    const skip = dto.offset || 0;
    const take = dto.limit || 50;

    const logs = await this.prisma.activityLog.findMany({
      where: {
        organizationId,
        ...(dto.workspaceId && { workspaceId: dto.workspaceId }),
        ...(dto.userId && { userId: dto.userId }),
        ...(dto.resourceType && { resourceType: dto.resourceType }),
        ...(dto.action && { action: dto.action }),
      },
      include: { user: true },
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    });

    const total = await this.prisma.activityLog.count({
      where: {
        organizationId,
        ...(dto.workspaceId && { workspaceId: dto.workspaceId }),
        ...(dto.userId && { userId: dto.userId }),
        ...(dto.resourceType && { resourceType: dto.resourceType }),
        ...(dto.action && { action: dto.action }),
      },
    });

    return { logs, total };
  }

  async getOrganizationStats(organizationId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalLogs, logsToday, uniqueUsers, recentActions] = await Promise.all([
      this.prisma.activityLog.count({ where: { organizationId } }),
      this.prisma.activityLog.count({
        where: { organizationId, timestamp: { gte: today } },
      }),
      this.prisma.activityLog.findMany({
        where: { organizationId },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.activityLog.findMany({
        where: { organizationId },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: { user: true },
      }),
    ]);

    return {
      totalLogs,
      logsToday,
      uniqueUsers: uniqueUsers.length,
      recentActions,
    };
  }
}
