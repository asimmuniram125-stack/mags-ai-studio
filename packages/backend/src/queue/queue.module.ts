import { Module } from '@nestjs/common';
import { AgentQueueService } from './agent-queue.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AgentQueueService],
  exports: [AgentQueueService],
})
export class QueueModule {}
