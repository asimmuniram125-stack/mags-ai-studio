import { io, Socket } from 'socket.io-client';
import { useInfrastructureStore } from '@/stores/infrastructure.store';
import { ClusterHealth, Deployment } from '@/types/infrastructure';

class InfrastructureWebSocketService {
  private socket: Socket | null = null;

  connect(url: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') {
    if (this.socket?.connected) return;

    this.socket = io(`${url}/infrastructure`, {
      reconnection: true,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Infrastructure WebSocket connected');
    });

    this.socket.on('cluster-health', (data: ClusterHealth) => {
      console.log('Cluster health update:', data);
    });

    this.socket.on('cluster-updated', (data: any) => {
      console.log('Cluster updated:', data);
    });

    this.socket.on('deployment-status', (data: Deployment) => {
      const store = useInfrastructureStore.getState();
      store.getDeploymentStatus(data.id);
    });

    this.socket.on('deployment-updated', (data: any) => {
      console.log('Deployment updated:', data);
    });

    this.socket.on('scaling-event', (data: any) => {
      console.log('Scaling event:', data);
    });

    this.socket.on('infra-alert', (data: any) => {
      console.log('Infrastructure alert:', data);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  initSession(userId: string, organizationId: string) {
    this.socket?.emit('init-infra-session', { userId, organizationId });
  }

  watchCluster(clusterId: string) {
    this.socket?.emit('watch-cluster', { clusterId });
  }

  unwatchCluster(clusterId: string) {
    this.socket?.emit('unwatch-cluster', { clusterId });
  }

  watchDeployment(deploymentId: string) {
    this.socket?.emit('watch-deployment', { deploymentId });
  }

  unwatchDeployment(deploymentId: string) {
    this.socket?.emit('unwatch-deployment', { deploymentId });
  }
}

export const infraWebSocketService = new InfrastructureWebSocketService();
