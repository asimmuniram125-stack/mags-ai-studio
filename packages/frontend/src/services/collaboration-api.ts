import { apiClient } from './api-client';
import { ActivityLog, Presence, SharedResource } from '@/types/collaboration';

export const collaborationApi = {
  // Activity Feed
  getActivityFeed: async (organizationId: string, filters?: any): Promise<any> => {
    const params = new URLSearchParams();
    if (filters?.workspaceId) params.append('workspaceId', filters.workspaceId);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.resourceType) params.append('resourceType', filters.resourceType);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`/org/${organizationId}/activity/feed?${params.toString()}`);
    return response.data;
  },

  getActivityStats: async (organizationId: string): Promise<any> => {
    const response = await apiClient.get(`/org/${organizationId}/activity/stats`);
    return response.data;
  },

  logActivity: async (data: any): Promise<void> => {
    // This is called via WebSocket in practice
    // But keep as HTTP fallback
  },

  // Presence
  getPresences: async (organizationId: string): Promise<Presence[]> => {
    const response = await apiClient.get(`/org/${organizationId}/presence`);
    return response.data;
  },

  updatePresence: async (status: string, currentResource?: string): Promise<void> => {
    // This is handled via WebSocket
  },

  // Shared Resources
  getSharedResources: async (workspaceId: string): Promise<SharedResource[]> => {
    const response = await apiClient.get(`/org/workspace/${workspaceId}/shared-resources`);
    return response.data;
  },

  shareResource: async (
    resourceType: string,
    resourceId: string,
    permissions: any,
  ): Promise<SharedResource> => {
    const response = await apiClient.post('/org/workspace/share', {
      resourceType,
      resourceId,
      permissions,
    });
    return response.data;
  },

  unshareResource: async (resourceId: string): Promise<void> => {
    await apiClient.delete(`/org/shared-resource/${resourceId}`);
  },
};
