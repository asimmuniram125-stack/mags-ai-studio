import { create } from 'zustand';
import { agentsApi } from '@/lib/agents-api';
import { Agent, CreateAgentPayload } from '@/types/agent';

interface AgentStore {
  agents: Agent[];
  activeAgent: Agent | null;
  isLoading: boolean;
  error: string | null;

  fetchAgents: () => Promise<void>;
  fetchAgent: (agentId: string) => Promise<void>;
  createAgent: (payload: CreateAgentPayload) => Promise<Agent>;
  setActiveAgent: (agent: Agent | null) => void;
  deleteAgent: (agentId: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  activeAgent: null,
  isLoading: false,
  error: null,

  fetchAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const agents = await agentsApi.getAgents();
      set({ agents });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch agents';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAgent: async (agentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const agent = await agentsApi.getAgent(agentId);
      set({ activeAgent: agent });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch agent';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  createAgent: async (payload: CreateAgentPayload) => {
    set({ isLoading: true, error: null });
    try {
      const newAgent = await agentsApi.createAgent(payload);
      set((state) => ({
        agents: [newAgent, ...state.agents],
        activeAgent: newAgent,
      }));
      return newAgent;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create agent';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveAgent: (agent) => {
    set({ activeAgent: agent });
  },

  deleteAgent: async (agentId: string) => {
    try {
      await agentsApi.deleteAgent(agentId);
      set((state) => ({
        agents: state.agents.filter((a) => a.id !== agentId),
        activeAgent: state.activeAgent?.id === agentId ? null : state.activeAgent,
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete agent';
      set({ error: message });
      throw error;
    }
  },

  setError: (error) => {
    set({ error });
  },
}));
