import { apiClient } from './api-client';
import { Agent, CreateAgentPayload } from '@/types/agent';

export const agentsApi = {
  createAgent: async (payload: CreateAgentPayload): Promise<Agent> => {
    const response = await apiClient.post<Agent>('/agents/create', payload);
    return response.data;
  },

  getAgent: async (agentId: string): Promise<Agent> => {
    const response = await apiClient.get<Agent>(`/agents/${agentId}`);
    return response.data;
  },

  getAgents: async (): Promise<Agent[]> => {
    const response = await apiClient.get<Agent[]>('/agents');
    return response.data;
  },

  deleteAgent: async (agentId: string): Promise<void> => {
    await apiClient.delete(`/agents/${agentId}`);
  },
};
