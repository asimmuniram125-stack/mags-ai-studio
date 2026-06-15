import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, any>;
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  checksum: string; // For immutability verification
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    changes: Record<string, any>,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      userId,
      action,
      resourceType,
      resourceId,
      changes,
      timestamp: Date.now(),
      ipAddress,
      userAgent,
      checksum: this.calculateChecksum({
        userId,
        action,
        resourceType,
        resourceId,
        changes,
        timestamp: Date.now(),
      }),
    };

    // Store in database (make immutable after creation)
    await this.prisma.auditLog.create({
      data: entry as any,
    });

    return entry;
  }

  async getAuditTrail(userId: string, limit: number = 100): Promise<AuditLogEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return logs as AuditLogEntry[];
  }

  async verifyAuditLogIntegrity(logId: string): Promise<boolean> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id: logId },
    });

    if (!log) return false;

    const storedChecksum = (log as any).checksum;
    const computedChecksum = this.calculateChecksum({
      userId: log.userId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      changes: log.changes,
      timestamp: log.timestamp,
    });

    return storedChecksum === computedChecksum;
  }

  private calculateChecksum(obj: any): string {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(obj))
      .digest('hex');
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  async generateComplianceReport(startDate: Date, endDate: Date): Promise<{
    totalActions: number;
    userActions: Record<string, number>;
    actionTypes: Record<string, number>;
    timeline: any[];
  }> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate.getTime(),
          lte: endDate.getTime(),
        },
      },
    });

    const userActions: Record<string, number> = {};
    const actionTypes: Record<string, number> = {};

    for (const log of logs) {
      userActions[log.userId] = (userActions[log.userId] || 0) + 1;
      actionTypes[log.action] = (actionTypes[log.action] || 0) + 1;
    }

    return {
      totalActions: logs.length,
      userActions,
      actionTypes,
      timeline: logs.sort((a, b) => a.timestamp - b.timestamp),
    };
  }
}