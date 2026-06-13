export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  userId: string;
  agentId?: string;
  title: string;
  description?: string;
  goal: string;
  input?: Record<string, any>;
  context?: string;
  status: TaskStatus;
  priority: TaskPriority;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  result?: Record<string, any>;
  error?: string;
  subtasks: string[];
  parentTaskId?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskPayload {
  title: string;
  goal: string;
  input: Record<string, any>;
  context?: string;
}
