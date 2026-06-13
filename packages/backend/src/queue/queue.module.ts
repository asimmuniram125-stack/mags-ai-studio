import { Module } from '@nestjs/common';
import { AgentQueueService } from './agent-queue.service';

@Module({
  providers: [AgentQueueService],
  exports: [AgentQueueService],
})
export class QueueModule {}
