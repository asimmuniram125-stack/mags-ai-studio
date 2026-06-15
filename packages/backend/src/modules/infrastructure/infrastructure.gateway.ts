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
import { ClusterService } from './services/cluster.service';
import { DeploymentService } from './services/deployment.service';
import { v4 as uuidv4 } from 'uuid';

interface InfraSession {
  userId: string;
  organizationId: string;
  sessionId: string;
  watchedClusters: Set<string>;
  watchedDeployments: Set<string>;
}

@WebSocketGateway({
  namespace: 'infrastructure',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@Injectable()
export class InfrastructureGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InfrastructureGateway.name);
  private sessions = new Map<string, InfraSession>();

  constructor(
    private clusterService: ClusterService,
    private deploymentService: DeploymentService,
  ) {}

  async handleConnection(socket: Socket) {
    this.logger.log(`Infrastructure WebSocket connected: ${socket.id}`);
  }

  async handleDisconnect(socket: Socket) {
    this.logger.log(`Infrastructure WebSocket disconnected: ${socket.id}`);
    this.sessions.delete(socket.id);
  }

  @SubscribeMessage('init-infra-session')
  async handleInitSession(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { userId: string; organizationId: string },
  ) {
    const sessionId = uuidv4();

    const session: InfraSession = {
      userId: data.userId,
      organizationId: data.organizationId,
      sessionId,
      watchedClusters: new Set(),
      watchedDeployments: new Set(),
    };

    this.sessions.set(socket.id, session);
    socket.join(`org-infra-${data.organizationId}`);

    socket.emit('infra-session-initialized', { sessionId });
  }

  @SubscribeMessage('watch-cluster')
  async handleWatchCluster(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { clusterId: string },
  ) {
    const session = this.sessions.get(socket.id);
    if (!session) return;

    session.watchedClusters.add(data.clusterId);
    socket.join(`cluster-${data.clusterId}`);

    // Send initial cluster health
    try {
      const health = await this.clusterService.getClusterHealth(data.clusterId);
      socket.emit('cluster-health', health);
    } catch (error) {
      this.logger.error(`Failed to get cluster health: ${error}`);
    }
  }

  @SubscribeMessage('unwatch-cluster')
  handleUnwatchCluster(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { clusterId: string },
  ) {
    const session = this.sessions.get(socket.id);
    if (!session) return;

    session.watchedClusters.delete(data.clusterId);
    socket.leave(`cluster-${data.clusterId}`);
  }

  @SubscribeMessage('watch-deployment')
  async handleWatchDeployment(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { deploymentId: string },
  ) {
    const session = this.sessions.get(socket.id);
    if (!session) return;

    session.watchedDeployments.add(data.deploymentId);
    socket.join(`deployment-${data.deploymentId}`);

    // Send initial deployment status
    try {
      const status = await this.deploymentService.getDeploymentStatus(data.deploymentId);
      socket.emit('deployment-status', status);
    } catch (error) {
      this.logger.error(`Failed to get deployment status: ${error}`);
    }
  }

  @SubscribeMessage('unwatch-deployment')
  handleUnwatchDeployment(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { deploymentId: string },
  ) {
    const session = this.sessions.get(socket.id);
    if (!session) return;

    session.watchedDeployments.delete(data.deploymentId);
    socket.leave(`deployment-${data.deploymentId}`);
  }

  emitClusterUpdate(clusterId: string, data: any) {
    this.server.to(`cluster-${clusterId}`).emit('cluster-updated', data);
  }

  emitClusterHealth(clusterId: string, health: any) {
    this.server.to(`cluster-${clusterId}`).emit('cluster-health', health);
  }

  emitDeploymentUpdate(deploymentId: string, data: any) {
    this.server.to(`deployment-${deploymentId}`).emit('deployment-updated', data);
  }

  emitDeploymentStatus(deploymentId: string, status: any) {
    this.server.to(`deployment-${deploymentId}`).emit('deployment-status', status);
  }

  emitScalingEvent(clusterId: string, event: any) {
    this.server.to(`cluster-${clusterId}`).emit('scaling-event', event);
  }

  emitAlert(organizationId: string, alert: any) {
    this.server.to(`org-infra-${organizationId}`).emit('infra-alert', alert);
  }
}
