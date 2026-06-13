import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway({ namespace: 'agents' })
export class AgentsGateway {
  @SubscribeMessage('agent-message')
  handleMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    return { data };
  }
}
