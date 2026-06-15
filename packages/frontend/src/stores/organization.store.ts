import { create } from 'zustand';
import { Organization, Membership, Workspace, Invitation } from '@/types/collaboration';
import { organizationApi } from '@/services/organization-api';

interface OrganizationStore {
  organizations: Organization[];
  currentOrganization: Organization | null;
  currentWorkspace: Workspace | null;
  members: Membership[];
  invitations: Invitation[];
  workspaces: Workspace[];

  isLoading: boolean;
  error: string | null;

  // Organization actions
  fetchOrganizations: () => Promise<void>;
  selectOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (name: string, type: string) => Promise<void>;
  updateOrganization: (organizationId: string, data: any) => Promise<void>;

  // Workspace actions
  fetchWorkspaces: (organizationId: string) => Promise<void>;
  selectWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string, description?: string) => Promise<void>;

  // Member actions
  fetchMembers: (organizationId: string) => Promise<void>;
  inviteUser: (email: string, role: string) => Promise<void>;
  updateMemberRole: (memberId: string, role: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;

  // Invitation actions
  fetchInvitations: (organizationId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;

  setError: (error: string | null) => void;
}

export const useOrganizationStore = create<OrganizationStore>((set, get) => ({
  organizations: [],
  currentOrganization: null,
  currentWorkspace: null,
  members: [],
  invitations: [],
  workspaces: [],
  isLoading: false,
  error: null,

  fetchOrganizations: async () => {
    set({ isLoading: true });
    try {
      const organizations = await organizationApi.getOrganizations();
      set({ organizations });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  selectOrganization: async (organizationId: string) => {
    set({ isLoading: true });
    try {
      const organization = await organizationApi.getOrganization(organizationId);
      set({ currentOrganization: organization });
      await get().fetchWorkspaces(organizationId);
      await get().fetchMembers(organizationId);
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  createOrganization: async (name: string, type: string) => {
    set({ isLoading: true });
    try {
      const organization = await organizationApi.createOrganization(name, type);
      set((state) => ({
        organizations: [...state.organizations, organization],
        currentOrganization: organization,
      }));
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  updateOrganization: async (organizationId: string, data: any) => {
    set({ isLoading: true });
    try {
      const updated = await organizationApi.updateOrganization(organizationId, data);
      set((state) => ({
        currentOrganization: state.currentOrganization?.id === organizationId ? updated : state.currentOrganization,
        organizations: state.organizations.map((org) =>
          org.id === organizationId ? updated : org,
        ),
      }));
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWorkspaces: async (organizationId: string) => {
    try {
      const workspaces = await organizationApi.getWorkspaces(organizationId);
      set({ workspaces });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  selectWorkspace: async (workspaceId: string) => {
    set({ isLoading: true });
    try {
      const workspace = await organizationApi.getWorkspace(workspaceId);
      set({ currentWorkspace: workspace });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  createWorkspace: async (name: string, description?: string) => {
    const { currentOrganization } = get();
    if (!currentOrganization) throw new Error('No organization selected');

    set({ isLoading: true });
    try {
      const workspace = await organizationApi.createWorkspace(
        currentOrganization.id,
        name,
        description,
      );
      set((state) => ({
        workspaces: [...state.workspaces, workspace],
      }));
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMembers: async (organizationId: string) => {
    try {
      const members = await organizationApi.getMembers(organizationId);
      set({ members });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  inviteUser: async (email: string, role: string) => {
    const { currentOrganization } = get();
    if (!currentOrganization) throw new Error('No organization selected');

    set({ isLoading: true });
    try {
      const invitation = await organizationApi.inviteUser(currentOrganization.id, email, role);
      set((state) => ({
        invitations: [invitation, ...state.invitations],
      }));
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  updateMemberRole: async (memberId: string, role: string) => {
    const { currentOrganization } = get();
    if (!currentOrganization) throw new Error('No organization selected');

    try {
      const updated = await organizationApi.updateMemberRole(
        currentOrganization.id,
        memberId,
        role,
      );
      set((state) => ({
        members: state.members.map((m) => (m.id === memberId ? updated : m)),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  removeMember: async (memberId: string) => {
    const { currentOrganization } = get();
    if (!currentOrganization) throw new Error('No organization selected');

    try {
      await organizationApi.removeMember(currentOrganization.id, memberId);
      set((state) => ({
        members: state.members.filter((m) => m.id !== memberId),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchInvitations: async (organizationId: string) => {
    try {
      const invitations = await organizationApi.getInvitations(organizationId);
      set({ invitations });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  cancelInvitation: async (invitationId: string) => {
    const { currentOrganization } = get();
    if (!currentOrganization) throw new Error('No organization selected');

    try {
      await organizationApi.cancelInvitation(currentOrganization.id, invitationId);
      set((state) => ({
        invitations: state.invitations.filter((i) => i.id !== invitationId),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
