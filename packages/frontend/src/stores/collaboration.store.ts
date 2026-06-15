import { create } from 'zustand';
import { ActivityLog, Presence, SharedResource } from '@/types/collaboration';
import { collaborationApi } from '@/services/collaboration-api';

interface CollaborationStore {
  activityLogs: ActivityLog[];
  presences: Presence[];
  sharedResources: SharedResource[];
  currentResourceView: { type: string; id: string } | null;
  typingUsers: Map<string, Set<string>>; // resourceId -> Set of userIds

  isLoading: boolean;
  error: string | null;

  // Activity actions
  fetchActivityFeed: (organizationId: string, filters?: any) => Promise<void>;
  logActivity: (data: any) => Promise<void>;

  // Presence actions
  getPresences: (organizationId: string) => Promise<void>;
  updatePresence: (status: string, currentResource?: string) => Promise<void>;

  // Shared resources
  fetchSharedResources: (workspaceId: string) => Promise<void>;
  shareResource: (resourceType: string, resourceId: string, permissions: any) => Promise<void>;
  unshareResource: (resourceId: string) => Promise<void>;

  // UI actions
  setCurrentResourceView: (type: string, id: string) => void;
  setTypingUser: (resourceId: string, userId: string) => void;
  removeTypingUser: (resourceId: string, userId: string) => void;

  setError: (error: string | null) => void;
}

export const useCollaborationStore = create<CollaborationStore>((set, get) => ({
  activityLogs: [],
  presences: [],
  sharedResources: [],
  currentResourceView: null,
  typingUsers: new Map(),
  isLoading: false,
  error: null,

  fetchActivityFeed: async (organizationId: string, filters?: any) => {
    set({ isLoading: true });
    try {
      const data = await collaborationApi.getActivityFeed(organizationId, filters);
      set({ activityLogs: data.logs });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  logActivity: async (data: any) => {
    try {
      await collaborationApi.logActivity(data);
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  getPresences: async (organizationId: string) => {
    try {
      const presences = await collaborationApi.getPresences(organizationId);
      set({ presences });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  updatePresence: async (status: string, currentResource?: string) => {
    try {
      await collaborationApi.updatePresence(status, currentResource);
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchSharedResources: async (workspaceId: string) => {
    set({ isLoading: true });
    try {
      const resources = await collaborationApi.getSharedResources(workspaceId);
      set({ sharedResources: resources });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  shareResource: async (resourceType: string, resourceId: string, permissions: any) => {
    try {
      const shared = await collaborationApi.shareResource(resourceType, resourceId, permissions);
      set((state) => ({
        sharedResources: [shared, ...state.sharedResources],
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  unshareResource: async (resourceId: string) => {
    try {
      await collaborationApi.unshareResource(resourceId);
      set((state) => ({
        sharedResources: state.sharedResources.filter((r) => r.id !== resourceId),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setCurrentResourceView: (type: string, id: string) => {
    set({ currentResourceView: { type, id } });
  },

  setTypingUser: (resourceId: string, userId: string) => {
    set((state) => {
      const newTyping = new Map(state.typingUsers);
      if (!newTyping.has(resourceId)) {
        newTyping.set(resourceId, new Set());
      }
      newTyping.get(resourceId)!.add(userId);
      return { typingUsers: newTyping };
    });
  },

  removeTypingUser: (resourceId: string, userId: string) => {
    set((state) => {
      const newTyping = new Map(state.typingUsers);
      if (newTyping.has(resourceId)) {
        newTyping.get(resourceId)!.delete(userId);
      }
      return { typingUsers: newTyping };
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
