import { create } from 'zustand';
import { workflowsApi } from '@/lib/workflows-api';
import { Workflow, CreateWorkflowPayload, WorkflowExecution } from '@/types/workflow';

interface WorkflowStore {
  workflows: Workflow[];
  activeWorkflow: Workflow | null;
  activeExecution: WorkflowExecution | null;
  isLoading: boolean;
  error: string | null;

  fetchWorkflows: () => Promise<void>;
  fetchWorkflow: (workflowId: string) => Promise<void>;
  createWorkflow: (payload: CreateWorkflowPayload) => Promise<Workflow>;
  updateWorkflow: (workflowId: string, updates: Partial<Workflow>) => Promise<void>;
  publishWorkflow: (workflowId: string) => Promise<void>;
  executeWorkflow: (workflowId: string) => Promise<string>;
  setActiveWorkflow: (workflow: Workflow | null) => void;
  setActiveExecution: (execution: WorkflowExecution | null) => void;
  setError: (error: string | null) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflows: [],
  activeWorkflow: null,
  activeExecution: null,
  isLoading: false,
  error: null,

  fetchWorkflows: async () => {
    set({ isLoading: true, error: null });
    try {
      const workflows = await workflowsApi.getWorkflows();
      set({ workflows });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch workflows' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWorkflow: async (workflowId: string) => {
    set({ isLoading: true, error: null });
    try {
      const workflow = await workflowsApi.getWorkflow(workflowId);
      set({ activeWorkflow: workflow });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch workflow' });
    } finally {
      set({ isLoading: false });
    }
  },

  createWorkflow: async (payload: CreateWorkflowPayload) => {
    set({ isLoading: true, error: null });
    try {
      const workflow = await workflowsApi.createWorkflow(payload);
      set((state) => ({
        workflows: [workflow, ...state.workflows],
        activeWorkflow: workflow,
      }));
      return workflow;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create workflow' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateWorkflow: async (workflowId: string, updates: Partial<Workflow>) => {
    try {
      const updated = await workflowsApi.updateWorkflow(workflowId, updates);
      set((state) => ({
        workflows: state.workflows.map((w) => (w.id === workflowId ? updated : w)),
        activeWorkflow: state.activeWorkflow?.id === workflowId ? updated : state.activeWorkflow,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update workflow' });
      throw error;
    }
  },

  publishWorkflow: async (workflowId: string) => {
    try {
      await workflowsApi.publishWorkflow(workflowId);
      set((state) => ({
        workflows: state.workflows.map((w) =>
          w.id === workflowId ? { ...w, isDraft: false } : w,
        ),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to publish workflow' });
      throw error;
    }
  },

  executeWorkflow: async (workflowId: string) => {
    try {
      const executionId = await workflowsApi.executeWorkflow(workflowId);
      return executionId;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to execute workflow' });
      throw error;
    }
  },

  setActiveWorkflow: (workflow) => {
    set({ activeWorkflow: workflow });
  },

  setActiveExecution: (execution) => {
    set({ activeExecution: execution });
  },

  setError: (error) => {
    set({ error });
  },
}));
