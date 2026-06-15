import { apiClient } from './api-client';
import { Organization, Membership, Workspace, Invitation } from '@/types/collaboration';

export const organizationApi = {
  // Organizations
  getOrganizations: async (): Promise<Organization[]> => {
    const response = await apiClient.get('/org');
    return response.data;
  },

  getOrganization: async (id: string): Promise<Organization> => {
    const response = await apiClient.get(`/org/${id}`);
    return response.data;
  },

  createOrganization: async (name: string, type: string): Promise<Organization> => {
    const response = await apiClient.post('/org/create', { name, type });
    return response.data;
  },

  updateOrganization: async (id: string, data: any): Promise<Organization> => {
    const response = await apiClient.put(`/org/${id}`, data);
    return response.data;
  },

  // Members
  getMembers: async (organizationId: string): Promise<Membership[]> => {
    const response = await apiClient.get(`/org/${organizationId}/members`);
    return response.data;
  },

  inviteUser: async (organizationId: string, email: string, role: string): Promise<Invitation> => {
    const response = await apiClient.post(`/org/${organizationId}/invite`, {
      email,
      role,
    });
    return response.data;
  },

  updateMemberRole: async (
    organizationId: string,
    memberId: string,
    role: string,
  ): Promise<Membership> => {
    const response = await apiClient.put(`/org/${organizationId}/members/${memberId}/role`, {
      role,
    });
    return response.data;
  },

  removeMember: async (organizationId: string, memberId: string): Promise<void> => {
    await apiClient.delete(`/org/${organizationId}/members/${memberId}`);
  },

  // Invitations
  getInvitations: async (organizationId: string): Promise<Invitation[]> => {
    const response = await apiClient.get(`/org/${organizationId}/invitations`);
    return response.data;
  },

  cancelInvitation: async (organizationId: string, invitationId: string): Promise<void> => {
    await apiClient.delete(`/org/${organizationId}/invitations/${invitationId}`);
  },

  // Workspaces
  getWorkspaces: async (organizationId: string): Promise<Workspace[]> => {
    const response = await apiClient.get(`/org/${organizationId}/workspaces`);
    return response.data;
  },

  getWorkspace: async (workspaceId: string): Promise<Workspace> => {
    const response = await apiClient.get(`/org/workspace/${workspaceId}`);
    return response.data;
  },

  createWorkspace: async (
    organizationId: string,
    name: string,
    description?: string,
  ): Promise<Workspace> => {
    const response = await apiClient.post(`/org/${organizationId}/workspace`, {
      name,
      description,
    });
    return response.data;
  },

  updateWorkspace: async (
    workspaceId: string,
    data: any,
  ): Promise<Workspace> => {
    const response = await apiClient.put(`/org/workspace/${workspaceId}`, data);
    return response.data;
  },

  deleteWorkspace: async (workspaceId: string): Promise<void> => {
    await apiClient.delete(`/org/workspace/${workspaceId}`);
  },
};
