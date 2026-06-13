import { create } from 'zustand';
import { tasksApi } from '@/lib/tasks-api';
import { Task, CreateTaskPayload } from '@/types/task';

interface TaskStore {
  tasks: Map<string, Task>;
  isLoading: boolean;
  error: string | null;

  fetchTask: (taskId: string) => Promise<Task>;
  createTask: (agentId: string, payload: CreateTaskPayload) => Promise<string>;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  getAgentTasks: (agentId: string) => Promise<Task[]>;
  cancelTask: (taskId: string) => Promise<void>;
  retryTask: (taskId: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: new Map(),
  isLoading: false,
  error: null,

  fetchTask: async (taskId: string) => {
    const cached = get().tasks.get(taskId);
    if (cached) return cached;

    set({ isLoading: true, error: null });
    try {
      const task = await tasksApi.getTask(taskId);
      set((state) => {
        const newTasks = new Map(state.tasks);
        newTasks.set(taskId, task);
        return { tasks: newTasks };
      });
      return task;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch task' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  createTask: async (agentId: string, payload: CreateTaskPayload) => {
    set({ isLoading: true, error: null });
    try {
      const taskId = await tasksApi.createTask(agentId, payload);
      return taskId;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create task' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateTask: (taskId, updates) => {
    set((state) => {
      const task = state.tasks.get(taskId);
      if (task) {
        const newTasks = new Map(state.tasks);
        newTasks.set(taskId, { ...task, ...updates });
        return { tasks: newTasks };
      }
      return state;
    });
  },

  getAgentTasks: async (agentId: string) => {
    try {
      return await tasksApi.getAgentTasks(agentId);
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch tasks' });
      throw error;
    }
  },

  cancelTask: async (taskId: string) => {
    try {
      await tasksApi.cancelTask(taskId);
      get().updateTask(taskId, { status: 'cancelled' });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to cancel task' });
      throw error;
    }
  },

  retryTask: async (taskId: string) => {
    try {
      await tasksApi.retryTask(taskId);
      get().updateTask(taskId, { status: 'pending', retryCount: (get().tasks.get(taskId)?.retryCount || 0) + 1 });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to retry task' });
      throw error;
    }
  },

  setError: (error) => {
    set({ error });
  },
}));
