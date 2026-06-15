import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '@/database/prisma.service';
import { OrganizationController } from './controllers/organization.controller';
import { OrganizationService } from './services/organization.service';
import { WorkspaceService } from './services/workspace.service';
import { InvitationService } from './services/invitation.service';
import { ActivityService } from './services/activity.service';
import { PresenceService } from './services/presence.service';
import { SharedResourceService } from './services/shared-resource.service';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationProcessor } from './workers/collaboration.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'collaboration' }),
  ],
  controllers: [OrganizationController],
  providers: [
    PrismaService,
    OrganizationService,
    WorkspaceService,
    InvitationService,
    ActivityService,
    PresenceService,
    SharedResourceService,
    CollaborationGateway,
    CollaborationProcessor,
  ],
  exports: [
    OrganizationService,
    WorkspaceService,
    InvitationService,
    ActivityService,
    PresenceService,
    SharedResourceService,
  ],
})
export class CollaborationModule {}
