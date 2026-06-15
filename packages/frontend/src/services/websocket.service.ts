import { io, Socket } from 'socket.io-client';
import { useOrganizationStore } from '@/stores/organization.store';
import { useCollaborationStore } from '@/stores/collaboration.store';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') {
    if (this.socket?.connected) return;

    this.socket = io(`${url}/collaboration`, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('reconnect_attempt', () => {
      this.reconnectAttempts++;
      console.log(`Reconnect attempt ${this.reconnectAttempts}`);
    });

    // Activity events
    this.socket.on('activity', (data) => {
      const store = useCollaborationStore.getState();
      store.setError(null);
    });

    this.socket.on('resource-updated', (data) => {
      // Handle resource update
    });

    this.socket.on('user-typing', (data) => {
      const store = useCollaborationStore.getState();
      store.setTypingUser(data.resourceId, data.userId);
    });

    this.socket.on('user-stopped-typing', (data) => {
      const store = useCollaborationStore.getState();
      store.removeTypingUser(data.resourceId, data.userId);
    });

    this.socket.on('presence-updated', (data) => {
      // Handle presence update
    });

    this.socket.on('notification', (data) => {
      console.log('Notification:', data);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  initSession(userId: string, organizationId: string, workspaceId?: string) {
    if (!this.socket?.connected) {
      this.connect();
    }

    this.socket?.emit('init-session', { userId, organizationId, workspaceId });
  }

  updatePresence(status: string, currentResource?: string) {
    this.socket?.emit('update-presence', { status, currentResource });
  }

  logActivity(data: any) {
    this.socket?.emit('activity-log', data);
  }

  updateResource(data: any) {
    this.socket?.emit('resource-update', data);
  }

  startTyping(resourceType: string, resourceId: string) {
    this.socket?.emit('start-typing', { resourceType, resourceId });
  }

  stopTyping(resourceType: string, resourceId: string) {
    this.socket?.emit('stop-typing', { resourceType, resourceId });
  }

  joinResource(resourceType: string, resourceId: string) {
    this.socket?.emit('join-resource', { resourceType, resourceId });
  }

  leaveResource(resourceType: string, resourceId: string) {
    this.socket?.emit('leave-resource', { resourceType, resourceId });
  }

  sendChatMessage(message: string, channelId: string) {
    this.socket?.emit('chat-message', { message, channelId });
  }

  sendNotification(title: string, message: string, type: string) {
    this.socket?.emit('notification', { title, message, type });
  }
}

export const websocketService = new WebSocketService();
