import { apiClient } from './api-client';
import { Workflow, CreateWorkflowPayload } from '@/types/workflow';

export const workflowsApi = {
  createWorkflow: async (payload: CreateWorkflowPayload): Promise<Workflow> => {
    const response = await apiClient.post<Workflow>('/workflows/create', payload);
    return response.data;
  },

  getWorkflows: async (): Promise<Workflow[]> => {
    const response = await apiClient.get<Workflow[]>('/workflows');
    return response.data;
  },

  getWorkflow: async (workflowId: string): Promise<Workflow> => {
    const response = await apiClient.get<Workflow>(`/workflows/${workflowId}`);
    return response.data;
  },

  updateWorkflow: async (workflowId: string, updates: Partial<Workflow>): Promise<Workflow> => {
    const response = await apiClient.patch<Workflow>(`/workflows/${workflowId}`, updates);
    return response.data;
  },

  publishWorkflow: async (workflowId: string): Promise<void> => {
    await apiClient.post(`/workflows/${workflowId}/publish`);
  },

  executeWorkflow: async (workflowId: string): Promise<string> => {
    const response = await apiClient.post(`/workflows/${workflowId}/execute`);
    return response.data.executionId;
  },
};
