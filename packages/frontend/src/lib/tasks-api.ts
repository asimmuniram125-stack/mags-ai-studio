import { apiClient } from './api-client';
import { Task, CreateTaskPayload } from '@/types/task';

export const tasksApi = {
  createTask: async (agentId: string, payload: CreateTaskPayload): Promise<string> => {
    const response = await apiClient.post(`/agents/${agentId}/task`, payload);
    return response.data.taskId;
  },

  getTask: async (taskId: string): Promise<Task> => {
    const response = await apiClient.get<Task>(`/tasks/${taskId}`);
    return response.data;
  },

  getAgentTasks: async (agentId: string): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>(`/agents/${agentId}/tasks`);
    return response.data;
  },

  cancelTask: async (taskId: string): Promise<void> => {
    await apiClient.post(`/tasks/${taskId}/cancel`);
  },

  retryTask: async (taskId: string): Promise<void> => {
    await apiClient.post(`/tasks/${taskId}/retry`);
  },
};
