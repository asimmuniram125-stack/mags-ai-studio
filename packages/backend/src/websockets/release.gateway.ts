import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ReleaseService } from '../launch/release.service';

@WebSocketGateway({
  namespace: 'release',
  cors: { origin: process.env.FRONTEND_URL },
})
export class ReleaseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly releaseService: ReleaseService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.broadcastCurrentRelease();
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('watch-release')
  async watchRelease(client: Socket): Promise<void> {
    this.broadcastCurrentRelease();
  }

  async broadcastCurrentRelease(): Promise<void> {
    const currentRelease = await this.releaseService.getCurrentRelease();
    this.server.emit('release-update', currentRelease);
  }

  async notifyReleasePublished(releaseId: string): Promise<void> {
    const release = await this.releaseService.getReleaseHistory(1);
    this.server.emit('release-published', release[0]);
  }

  async notifyRolloutProgress(releaseId: string, percentage: number): Promise<void> {
    this.server.emit('rollout-progress', { releaseId, percentage });
  }
}
