import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface Feedback {
  id: string;
  userId: string;
  type: 'bug' | 'feature-request' | 'improvement' | 'other';
  title: string;
  description: string;
  metadata: Record<string, any>;
  status: 'open' | 'in-progress' | 'completed' | 'declined';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async submitFeedback(data: Partial<Feedback>): Promise<Feedback> {
    const feedback = await this.prisma.feedback.create({
      data: {
        userId: data.userId || '',
        type: data.type || 'other',
        title: data.title || '',
        description: data.description || '',
        metadata: data.metadata || {},
        status: 'open',
        priority: data.priority || 'medium',
      },
    });

    return feedback as Feedback;
  }

  async getFeedback(limit: number = 50): Promise<Feedback[]> {
    return await this.prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async updateFeedbackStatus(
    feedbackId: string,
    status: string,
  ): Promise<Feedback> {
    return await this.prisma.feedback.update({
      where: { id: feedbackId },
      data: { status },
    });
  }
}
