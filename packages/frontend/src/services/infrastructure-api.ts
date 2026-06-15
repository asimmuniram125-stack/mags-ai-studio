import { apiClient } from './api-client';
import { Cluster, ClusterHealth, Deployment, ScalingPolicy, LoadBalancerRule } from '@/types/infrastructure';

export const infrastructureApi = {
  // Clusters
  getClusters: async (): Promise<Cluster[]> => {
    const response = await apiClient.get('/infra/clusters');
    return response.data;
  },

  getCluster: async (id: string): Promise<Cluster> => {
    const response = await apiClient.get(`/infra/cluster/${id}`);
    return response.data;
  },

  createCluster: async (data: any): Promise<Cluster> => {
    const response = await apiClient.post('/infra/cluster/create', data);
    return response.data;
  },

  getClusterHealth: async (id: string): Promise<ClusterHealth> => {
    const response = await apiClient.get(`/infra/cluster/${id}/health`);
    return response.data;
  },

  scaleCluster: async (id: string, nodeCount: number): Promise<void> => {
    await apiClient.post(`/infra/cluster/${id}/scale`, {
      desiredNodeCount: nodeCount,
    });
  },

  deleteCluster: async (id: string): Promise<void> => {
    await apiClient.delete(`/infra/cluster/${id}`);
  },

  // Deployments
  deployGlobally: async (appId: string, regions: string[]): Promise<Deployment> => {
    const response = await apiClient.post('/infra/deploy/global', {
      appId,
      regions,
    });
    return response.data.deployment;
  },

  deployCanary: async (deploymentId: string, percentage: number): Promise<void> => {
    await apiClient.post(`/infra/deploy/${deploymentId}/canary`, {
      initialPercentage: percentage,
    });
  },

  rollbackDeployment: async (deploymentId: string): Promise<void> => {
    await apiClient.post(`/infra/deploy/${deploymentId}/rollback`);
  },

  getDeploymentStatus: async (deploymentId: string): Promise<Deployment> => {
    const response = await apiClient.get(`/infra/deploy/${deploymentId}/status`);
    return response.data;
  },

  getDeploymentHistory: async (appId: string): Promise<Deployment[]> => {
    const response = await apiClient.get(`/infra/app/${appId}/deployments`);
    return response.data;
  },

  // Scaling Policies
  createScalingPolicy: async (clusterId: string, data: any): Promise<ScalingPolicy> => {
    const response = await apiClient.post('/infra/scaling-policy/create', {
      clusterId,
      ...data,
    });
    return response.data;
  },

  getScalingPolicies: async (clusterId: string): Promise<ScalingPolicy[]> => {
    const response = await apiClient.get(`/infra/cluster/${clusterId}/scaling-policies`);
    return response.data;
  },

  // Load Balancer
  createLoadBalancerRule: async (appId: string, data: any): Promise<LoadBalancerRule> => {
    const response = await apiClient.post('/infra/load-balancer/rule', {
      appId,
      ...data,
    });
    return response.data;
  },

  getLoadBalancerRules: async (appId: string): Promise<LoadBalancerRule[]> => {
    const response = await apiClient.get(`/infra/app/${appId}/load-balancer/rules`);
    return response.data;
  },
};
