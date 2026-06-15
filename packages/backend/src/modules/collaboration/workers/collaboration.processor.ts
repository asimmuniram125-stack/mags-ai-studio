import { Injectable, Logger } from '@nestjs/common';
import { Worker, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '@/database/prisma.service';
import { ActivityService } from '../services/activity.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CollaborationProcessor {
  private readonly logger = new Logger(CollaborationProcessor.name);
  private worker: Worker;

  constructor(
    @InjectQueue('collaboration') private collaborationQueue: Queue,
    private prisma: PrismaService,
    private activityService: ActivityService,
    private configService: ConfigService,
  ) {
    this.setupWorker();
  }

  private setupWorker(): void {
    this.worker = new Worker(
      'collaboration',
      async (job) => {
        switch (job.name) {
          case 'send-invitation-email':
            await this.handleInvitationEmail(job.data);
            break;
          case 'invitation-accepted':
            await this.handleInvitationAccepted(job.data);
            break;
          case 'organization-created':
            await this.handleOrganizationCreated(job.data);
            break;
          case 'activity-log':
            await this.handleActivityLog(job.data);
            break;
          case 'member-role-changed':
            await this.handleMemberRoleChanged(job.data);
            break;
          default:
            this.logger.warn(`Unknown job type: ${job.name}`);
        }
      },
      {
        connection: {
          host: this.configService.get('REDIS_HOST') || 'localhost',
          port: this.configService.get('REDIS_PORT') || 6379,
        },
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Collaboration job ${job?.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Collaboration job ${job?.id} failed:`, err);
    });
  }

  private async handleInvitationEmail(data: any): Promise<void> {
    this.logger.log(`Sending invitation email to ${data.email}`);
    // Implement email sending logic
    // For now, just log
  }

  private async handleInvitationAccepted(data: any): Promise<void> {
    this.logger.log(`Invitation accepted for user ${data.userId} in org ${data.organizationId}`);

    // Send welcome email
    // Update user preferences
    // Trigger onboarding
  }

  private async handleOrganizationCreated(data: any): Promise<void> {
    this.logger.log(`Organization created: ${data.organizationId} by ${data.userId}`);

    // Send creation confirmation email
    // Initialize organization resources
    // Queue first-time setup
  }

  private async handleActivityLog(data: any): Promise<void> {
    await this.activityService.logActivity(
      data.organizationId,
      data.userId,
      data.action,
      data.resourceType,
      data.resourceId,
      data.resourceName,
      data.changes,
      data.metadata,
      data.workspaceId,
    );
  }

  private async handleMemberRoleChanged(data: any): Promise<void> {
    this.logger.log(`Member role changed: ${data.memberId} to ${data.newRole}`);

    // Send role change notification
    // Update member permissions
  }
}
