import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { PresenceService } from './services/presence.service';
import { ActivityService } from './services/activity.service';
import { PrismaService } from '@/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

interface UserSession {
  userId: string;
  organizationId: string;
  workspaceId?: string;
  sessionId: string;
}

@WebSocketGateway({
  namespace: 'collaboration',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@Injectable()
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CollaborationGateway.name);
  private userSessions = new Map<string, UserSession>();

  constructor(
    private presenceService: PresenceService,
    private activityService: ActivityService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket) {
    this.logger.log(`WebSocket connected: ${socket.id}`);
  }

  async handleDisconnect(socket: Socket) {
    this.logger.log(`WebSocket disconnected: ${socket.id}`);

    const session = this.userSessions.get(socket.id);
    if (session) {
      await this.presenceService.setOffline(session.userId, session.organizationId, session.sessionId);
      
      // Notify others
      this.server
        .to(`org-${session.organizationId}`)
        .emit('user-offline', { userId: session.userId });

      this.userSessions.delete(socket.id);
    }
  }

  @SubscribeMessage('init-session')
  async handleInitSession(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { userId: string; organizationId: string; workspaceId?: string },
  ) {
    const sessionId = uuidv4();

    const session: UserSession = {
      userId: data.userId,
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      sessionId,
    };

    this.userSessions.set(socket.id, session);

    // Join organization room
    socket.join(`org-${data.organizationId}`);
    if (data.workspaceId) {
      socket.join(`workspace-${data.workspaceId}`);
    }

    // Update presence
    await this.presenceService.updatePresence(data.organizationId, data.userId, sessionId, {
      status: 'ONLINE',
    });

    // Notify others
    this.server.to(`org-${data.organizationId}`).emit('user-online', {
      userId: data.userId,
      status: 'ONLINE',
      sessionId,
    });

    socket.emit('session-initialized', { sessionId });
  }

  @SubscribeMessage('update-presence')
  async handleUpdatePresence(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { status: string; currentResource?: string },
  ) {
    const session = this.userSessions.get(socket.id);
    if (!session) return;

    await this.presenceService.updatePresence(
      session.organizationId,
      session.userId,
      session.sessionId,
      {
        status: data.status as any,
        currentResource: data.currentResource,
      },
    );

    // Broadcast to organization
    this.server.to(`org-${session.organizationId}`).emit('presence-updated', {
      userId: session.userId,
      status: data.status,
      currentResource: data.currentResource,
    });
  }

  @SubscribeMessage('activity-log')
  async handleActivityLog(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: {
      action: string;
      resourceType: string;
      resourceId?: string;
      resourceName?: string;
      changes?: Record<string, any>;
      metadata?: Record<string, any>;
    },
  ) {
    const session = this.userSessions.get(socket.id);
    if (!session) return;

    await this.activityService.logActivity(
      session.organizationId,
      session.userId,
      data.action,
      data.resourceType,
      data.resourceId,
      data.resourceName,
      data.changes,
      data.metadata,
      session.workspaceId,
      socket.handshake.address,
      socket.handshake.headers['user-agent'],
    );

    // Broadcast activity
    const room = session.workspaceId ? `workspace-${session.workspaceId}` : `org-${session.organizationId}`;
    this.server.to(room).emit('activity', {
      userId: session.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceName: data.resourceName,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('resource-update')
  async handleResourceUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: {
      resourceType: string;
      resourceId: string;
      resourceName: string;
      changes: Record<string, any>;
    },
  ) {
    const session = this.userSessions.get(socket.id);
    if (!session) return;

    // Broadcast resource update to workspace
    if (session.workspaceId) {
      this.server.to(`workspace-${session.workspaceId}`).emit('resource-updated', {
        userId: session.userId,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        resourceName: data.resourceName,
        changes: data.changes,
        timestamp: new Date(),
      });
    } else {
      this.server.to(`org-${session.organizationId}`).emit('resource-updated', {
        userId: session.userId,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        resourceName: data.resourceName,
        changes: data.changes,
        timestamp: new Date(),
      });
    }

    // Log activity
    await this.activityService.logActivity(
      session.organizationId,
      session.userId,
      'UPDATED',
      data.resourceType,
      data.resourceId,
      data.resourceName,
      data.changes,
      { type: 'resource-update' },
      session.workspaceId,
    );
  }

  @SubscribeMessage('chat-message')
  handleChatMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { message: string; channelId: string },
  ) {
    const session = this.userSessions.get(socket.id);
    if (!session) return;

    // Broadcast to workspace
    if (session.workspaceId) {
      this.server.to(`workspace-${session.workspaceId}`).emit('new-message', {
        userId: session.userId,
        message: data.message,
        channelId: data.channelId,
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('start-typing')
  handleStartTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { resourceType: string; resourceId: string },
  ) {
    const session = this.userSessions.get(socket.id);
    if (!session) return;

    this.server.to(`org-${session.organizationId}`).emit('user-typing', {
      userId: session.userId,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
    });
  }

  @SubscribeMessage('stop-typing')
  handleStopTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { resourceType: string; resourceId: string },
  ) {
    const session = this.userSessions.get(socket.id);
    if (!session) return;

    this.server.to(`org-${session.organizationId}`).emit('user-stopped-typing', {
      userId: session.userId,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
    });
  }

  @SubscribeMessage('join-resource')
  handleJoinResource(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { resourceType: string; resourceId: string },
  ) {
    const session = this.userSessions.get(socket.id);
    if (!session) return;

    const roomId = `${data.resourceType}-${data.resourceId}`;
    socket.join(roomId);

    this.server.to(roomId).emit('user-joined-resource', {
      userId: session.userId,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
    });
  }

  @SubscribeMessage('leave-resource')
  handleLeaveResource(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { resourceType: string; resourceId: string },
  ) {
    const session = this.userSessions.get(socket.id);
    if (!session) return;

    const roomId = `${data.resourceType}-${data.resourceId}`;
    socket.leave(roomId);

    this.server.to(roomId).emit('user-left-resource', {
      userId: session.userId,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
    });
  }

  @SubscribeMessage('notification')
  handleNotification(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { title: string; message: string; type: string },
  ) {
    const session = this.userSessions.get(socket.id);
    if (!session) return;

    this.server.to(`org-${session.organizationId}`).emit('notification', {
      title: data.title,
      message: data.message,
      type: data.type,
      timestamp: new Date(),
    });
  }

  emitActivityToOrganization(organizationId: string, event: string, data: any) {
    this.server.to(`org-${organizationId}`).emit(event, data);
  }

  emitActivityToWorkspace(workspaceId: string, event: string, data: any) {
    this.server.to(`workspace-${workspaceId}`).emit(event, data);
  }

  emitActivityToResource(resourceType: string, resourceId: string, event: string, data: any) {
    const roomId = `${resourceType}-${resourceId}`;
    this.server.to(roomId).emit(event, data);
  }
}
