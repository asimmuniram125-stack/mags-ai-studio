import { create } from 'zustand';
import {
  Cluster,
  ClusterHealth,
  Deployment,
  ScalingPolicy,
  LoadBalancerRule,
} from '@/types/infrastructure';
import { infrastructureApi } from '@/services/infrastructure-api';

interface InfrastructureStore {
  clusters: Cluster[];
  clusterHealth: Map<string, ClusterHealth>;
  deployments: Deployment[];
  scalingPolicies: Map<string, ScalingPolicy[]>;
  loadBalancerRules: Map<string, LoadBalancerRule[]>;

  isLoading: boolean;
  error: string | null;

  // Cluster actions
  fetchClusters: () => Promise<void>;
  createCluster: (data: any) => Promise<void>;
  scaleCluster: (clusterId: string, nodeCount: number) => Promise<void>;
  deleteCluster: (clusterId: string) => Promise<void>;
  getClusterHealth: (clusterId: string) => Promise<void>;

  // Deployment actions
  deployGlobally: (appId: string, regions: string[]) => Promise<void>;
  deployCanary: (deploymentId: string, percentage: number) => Promise<void>;
  rollbackDeployment: (deploymentId: string) => Promise<void>;
  getDeploymentStatus: (deploymentId: string) => Promise<void>;
  getDeploymentHistory: (appId: string) => Promise<void>;

  // Scaling actions
  createScalingPolicy: (clusterId: string, data: any) => Promise<void>;
  getScalingPolicies: (clusterId: string) => Promise<void>;

  // Load balancer actions
  createLoadBalancerRule: (appId: string, data: any) => Promise<void>;
  getLoadBalancerRules: (appId: string) => Promise<void>;

  setError: (error: string | null) => void;
}

export const useInfrastructureStore = create<InfrastructureStore>((set, get) => ({
  clusters: [],
  clusterHealth: new Map(),
  deployments: [],
  scalingPolicies: new Map(),
  loadBalancerRules: new Map(),
  isLoading: false,
  error: null,

  fetchClusters: async () => {
    set({ isLoading: true });
    try {
      const clusters = await infrastructureApi.getClusters();
      set({ clusters });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  createCluster: async (data: any) => {
    set({ isLoading: true });
    try {
      const cluster = await infrastructureApi.createCluster(data);
      set((state) => ({
        clusters: [...state.clusters, cluster],
      }));
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  scaleCluster: async (clusterId: string, nodeCount: number) => {
    try {
      await infrastructureApi.scaleCluster(clusterId, nodeCount);
      set((state) => ({
        clusters: state.clusters.map((c) =>
          c.id === clusterId ? { ...c, nodeCount } : c,
        ),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deleteCluster: async (clusterId: string) => {
    try {
      await infrastructureApi.deleteCluster(clusterId);
      set((state) => ({
        clusters: state.clusters.filter((c) => c.id !== clusterId),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  getClusterHealth: async (clusterId: string) => {
    try {
      const health = await infrastructureApi.getClusterHealth(clusterId);
      set((state) => {
        const newHealthMap = new Map(state.clusterHealth);
        newHealthMap.set(clusterId, health);
        return { clusterHealth: newHealthMap };
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deployGlobally: async (appId: string, regions: string[]) => {
    set({ isLoading: true });
    try {
      const deployment = await infrastructureApi.deployGlobally(appId, regions);
      set((state) => ({
        deployments: [deployment, ...state.deployments],
      }));
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  deployCanary: async (deploymentId: string, percentage: number) => {
    try {
      await infrastructureApi.deployCanary(deploymentId, percentage);
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  rollbackDeployment: async (deploymentId: string) => {
    try {
      await infrastructureApi.rollbackDeployment(deploymentId);
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  getDeploymentStatus: async (deploymentId: string) => {
    try {
      const deployment = await infrastructureApi.getDeploymentStatus(deploymentId);
      set((state) => ({
        deployments: state.deployments.map((d) =>
          d.id === deploymentId ? deployment : d,
        ),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  getDeploymentHistory: async (appId: string) => {
    try {
      const deployments = await infrastructureApi.getDeploymentHistory(appId);
      set({ deployments });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  createScalingPolicy: async (clusterId: string, data: any) => {
    try {
      const policy = await infrastructureApi.createScalingPolicy(clusterId, data);
      set((state) => {
        const newPolicies = new Map(state.scalingPolicies);
        const policies = newPolicies.get(clusterId) || [];
        newPolicies.set(clusterId, [...policies, policy]);
        return { scalingPolicies: newPolicies };
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  getScalingPolicies: async (clusterId: string) => {
    try {
      const policies = await infrastructureApi.getScalingPolicies(clusterId);
      set((state) => {
        const newPolicies = new Map(state.scalingPolicies);
        newPolicies.set(clusterId, policies);
        return { scalingPolicies: newPolicies };
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  createLoadBalancerRule: async (appId: string, data: any) => {
    try {
      const rule = await infrastructureApi.createLoadBalancerRule(appId, data);
      set((state) => {
        const newRules = new Map(state.loadBalancerRules);
        const rules = newRules.get(appId) || [];
        newRules.set(appId, [...rules, rule]);
        return { loadBalancerRules: newRules };
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  getLoadBalancerRules: async (appId: string) => {
    try {
      const rules = await infrastructureApi.getLoadBalancerRules(appId);
      set((state) => {
        const newRules = new Map(state.loadBalancerRules);
        newRules.set(appId, rules);
        return { loadBalancerRules: newRules };
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
