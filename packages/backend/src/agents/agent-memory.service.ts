import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

interface IAgentMemory {
  id: string;
  userId: string;
  agentId: string;
  type: string;
  content: string;
  relevance: number;
  createdAt: Date;
}

interface MemoryEntry {
  id: string;
  content: string;
  relevance: number;
  timestamp: Date;
}

@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  /**
   * Add memory entry
   */
  async addMemory(
    userId: string,
    agentId: string,
    type: 'short_term' | 'long_term' | 'session',
    content: string,
    linkedTaskId?: string,
  ): Promise<IAgentMemory> {
    const memory = await this.prisma.agentMemory.create({
      data: {
        userId,
        agentId,
        type,
        content,
        linkedTaskId,
        relevance: 1.0,
      },
    });

    // Cache short-term memory
    if (type === 'short_term') {
      const cacheKey = `memory:${agentId}:short_term`;
      const cached = await this.redisService.getJSON(cacheKey);
      const entries = Array.isArray(cached) ? cached : [];
      entries.push(memory);

      if (entries.length > 20) {
        entries.shift();
      }

      await this.redisService.setJSON(cacheKey, entries, 3600);
    }

    return memory;
  }

  /**
   * Get memory context for agent
   */
  async getMemoryContext(
    agentId: string,
    userId: string,
  ): Promise<Record<string, any>> {
    const shortTerm = await this.getShortTermMemory(agentId, userId);
    const longTerm = await this.getLongTermMemory(agentId, userId);
    const session = await this.getSessionMemory(agentId, userId);

    return {
      shortTerm,
      longTerm,
      session,
    };
  }

  /**
   * Get short-term memory (cached)
   */
  private async getShortTermMemory(agentId: string, userId: string): Promise<MemoryEntry[]> {
    const cacheKey = `memory:${agentId}:short_term`;

    const cached = await this.redisService.getJSON(cacheKey);
    if (cached) {
      return cached.map((m: any) => ({
        id: m.id,
        content: m.content,
        relevance: m.relevance,
        timestamp: new Date(m.createdAt),
      }));
    }

    const memories = await this.prisma.agentMemory.findMany({
      where: {
        agentId,
        userId,
        type: 'short_term',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return memories.map((m) => ({
      id: m.id,
      content: m.content,
      relevance: m.relevance,
      timestamp: m.createdAt,
    }));
  }

  /**
   * Get long-term memory
   */
  private async getLongTermMemory(agentId: string, userId: string): Promise<MemoryEntry[]> {
    const memories = await this.prisma.agentMemory.findMany({
      where: {
        agentId,
        userId,
        type: 'long_term',
      },
      orderBy: { relevance: 'desc' },
      take: 20,
    });

    return memories.map((m) => ({
      id: m.id,
      content: m.content,
      relevance: m.relevance,
      timestamp: m.createdAt,
    }));
  }

  /**
   * Get session memory
   */
  private async getSessionMemory(agentId: string, userId: string): Promise<MemoryEntry[]> {
    const memories = await this.prisma.agentMemory.findMany({
      where: {
        agentId,
        userId,
        type: 'session',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return memories.map((m) => ({
      id: m.id,
      content: m.content,
      relevance: m.relevance,
      timestamp: m.createdAt,
    }));
  }

  /**
   * Update memory relevance
   */
  async updateMemoryRelevance(memoryId: string, relevance: number): Promise<void> {
    await this.prisma.agentMemory.update({
      where: { id: memoryId },
      data: { relevance },
    });
  }

  /**
   * Clear expired memories
   */
  async clearExpiredMemories(): Promise<number> {
    const result = await this.prisma.agentMemory.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
