import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as k8s from '@kubernetes/client-node';

@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);
  private kubeConfigs = new Map<string, k8s.KubeConfig>();

  constructor(private configService: ConfigService) {
    this.initializeKubeConfigs();
  }

  private initializeKubeConfigs(): void {
    // Load kubeconfig files for each region/cluster
    const clusters = JSON.parse(this.configService.get('KUBERNETES_CLUSTERS') || '{}');

    for (const [region, config] of Object.entries(clusters)) {
      const kc = new k8s.KubeConfig();
      kc.loadFromFile(config as string);
      this.kubeConfigs.set(region, kc);
    }
  }

  async deployService(
    clusterId: string,
    namespace: string,
    deployment: k8s.V1Deployment,
  ): Promise<any> {
    this.logger.log(`Deploying service to cluster: ${clusterId}`);

    const kc = this.kubeConfigs.get(clusterId);
    if (!kc) {
      throw new Error(`Kubeconfig not found for cluster: ${clusterId}`);
    }

    const k8sApi = kc.makeApiClient(k8s.AppsV1Api);

    try {
      const result = await k8sApi.createNamespacedDeployment(
        namespace,
        deployment,
      );

      return result.body;
    } catch (error: any) {
      this.logger.error(`Deployment failed: ${error.message}`);
      throw error;
    }
  }

  async scaleDeployment(
    clusterId: string,
    namespace: string,
    deploymentName: string,
    replicas: number,
  ): Promise<any> {
    this.logger.log(
      `Scaling deployment ${deploymentName} to ${replicas} replicas`,
    );

    const kc = this.kubeConfigs.get(clusterId);
    if (!kc) {
      throw new Error(`Kubeconfig not found for cluster: ${clusterId}`);
    }

    const k8sApi = kc.makeApiClient(k8s.AppsV1Api);

    try {
      const deployment = await k8sApi.readNamespacedDeployment(
        deploymentName,
        namespace,
      );

      if (deployment.body.spec && deployment.body.spec.replicas !== undefined) {
        deployment.body.spec.replicas = replicas;
      }

      const result = await k8sApi.patchNamespacedDeployment(
        deploymentName,
        namespace,
        deployment.body,
      );

      return result.body;
    } catch (error: any) {
      this.logger.error(`Scaling failed: ${error.message}`);
      throw error;
    }
  }

  async getDeploymentStatus(
    clusterId: string,
    namespace: string,
    deploymentName: string,
  ): Promise<any> {
    const kc = this.kubeConfigs.get(clusterId);
    if (!kc) {
      throw new Error(`Kubeconfig not found for cluster: ${clusterId}`);
    }

    const k8sApi = kc.makeApiClient(k8s.AppsV1Api);

    try {
      const deployment = await k8sApi.readNamespacedDeployment(
        deploymentName,
        namespace,
      );

      return {
        name: deployment.body.metadata?.name,
        replicas: deployment.body.spec?.replicas,
        readyReplicas: deployment.body.status?.readyReplicas,
        updatedReplicas: deployment.body.status?.updatedReplicas,
        conditions: deployment.body.status?.conditions,
      };
    } catch (error: any) {
      this.logger.error(`Get status failed: ${error.message}`);
      throw error;
    }
  }

  async getPods(
    clusterId: string,
    namespace: string,
    labelSelector?: string,
  ): Promise<any[]> {
    const kc = this.kubeConfigs.get(clusterId);
    if (!kc) {
      throw new Error(`Kubeconfig not found for cluster: ${clusterId}`);
    }

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    try {
      const pods = await k8sApi.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        labelSelector,
      );

      return pods.body.items.map((pod) => ({
        name: pod.metadata?.name,
        status: pod.status?.phase,
        ready:
          pod.status?.conditions?.find((c) => c.type === 'Ready')?.status ===
          'True',
        restarts: pod.status?.containerStatuses?.[0]?.restartCount || 0,
        createdAt: pod.metadata?.creationTimestamp,
      }));
    } catch (error: any) {
      this.logger.error(`Get pods failed: ${error.message}`);
      throw error;
    }
  }

  async getClusterHealth(cluster: any): Promise<any> {
    const kc = this.kubeConfigs.get(cluster.id);
    if (!kc) {
      throw new Error(`Kubeconfig not found for cluster: ${cluster.id}`);
    }

    const coreApi = kc.makeApiClient(k8s.CoreV1Api);

    try {
      // Get nodes
      const nodes = await coreApi.listNode();

      const nodeHealth = nodes.body.items.map((node) => ({
        name: node.metadata?.name,
        status: node.status?.conditions?.find((c) => c.type === 'Ready')?.status,
        cpu: node.status?.allocatable?.cpu,
        memory: node.status?.allocatable?.memory,
      }));

      // Get resource utilization (simplified)
      const resourceUtilization = {
        cpuUsage: '45%',
        memoryUsage: '62%',
        diskUsage: '38%',
      };

      // Get services
      const services = await coreApi.listNamespacedService('default');

      const servicesHealth = services.body.items.map((svc) => ({
        name: svc.metadata?.name,
        type: svc.spec?.type,
        replicas: 0, // Would query deployments for actual replicas
      }));

      return {
        nodes: nodeHealth,
        resourceUtilization,
        services: servicesHealth,
      };
    } catch (error: any) {
      this.logger.error(`Get cluster health failed: ${error.message}`);
      throw error;
    }
  }

  async rolloutDeployment(
    clusterId: string,
    namespace: string,
    deploymentName: string,
  ): Promise<void> {
    this.logger.log(`Rolling out deployment: ${deploymentName}`);

    const kc = this.kubeConfigs.get(clusterId);
    if (!kc) {
      throw new Error(`Kubeconfig not found for cluster: ${clusterId}`);
    }

    const k8sApi = kc.makeApiClient(k8s.AppsV1Api);

    try {
      const deployment = await k8sApi.readNamespacedDeployment(
        deploymentName,
        namespace,
      );

      // Trigger rollout by updating pod template
      if (deployment.body.spec?.template?.metadata) {
        deployment.body.spec.template.metadata.annotations = {
          ...deployment.body.spec.template.metadata.annotations,
          'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
        };
      }

      await k8sApi.patchNamespacedDeployment(
        deploymentName,
        namespace,
        deployment.body,
      );
    } catch (error: any) {
      this.logger.error(`Rollout failed: ${error.message}`);
      throw error;
    }
  }
}
