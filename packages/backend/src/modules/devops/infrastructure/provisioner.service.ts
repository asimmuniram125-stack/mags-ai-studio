import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { InfrastructureTemplate, Environment, DeploymentTarget } from '@prisma/client';

@Injectable()
export class ProvisionerService {
  private readonly logger = new Logger(ProvisionerService.name);

  constructor(private prisma: PrismaService) {}

  async getOrCreateTemplate(
    type: string,
    targetType: DeploymentTarget,
  ): Promise<InfrastructureTemplate> {
    const template = await this.prisma.infrastructureTemplate.findFirst({
      where: {
        type: type as any,
        targetType,
      },
    });

    if (template) {
      return template;
    }

    return this.createTemplate(type, targetType);
  }

  private async createTemplate(
    type: string,
    targetType: DeploymentTarget,
  ): Promise<InfrastructureTemplate> {
    let config: Record<string, any>;
    let kubernetesManifest: string | undefined;
    let dockerCompose: string | undefined;
    let setupScript: string | undefined;

    switch (targetType) {
      case DeploymentTarget.KUBERNETES:
        config = this.getKubernetesConfig(type);
        kubernetesManifest = this.generateKubernetesManifest(type);
        break;
      case DeploymentTarget.DOCKER:
        config = this.getDockerConfig(type);
        dockerCompose = this.generateDockerCompose(type);
        break;
      case DeploymentTarget.VPS:
        config = this.getVPSConfig(type);
        setupScript = this.generateSetupScript(type);
        break;
      default:
        config = {};
    }

    return this.prisma.infrastructureTemplate.create({
      data: {
        name: `${type}-${targetType}`,
        description: `Infrastructure template for ${type} on ${targetType}`,
        type: type as any,
        targetType,
        config,
        kubernetesManifest,
        dockerCompose,
        setupScript,
        minReplicas: 1,
        maxReplicas: 3,
        targetCpuUtilization: 70,
        targetMemUtilization: 80,
      },
    });
  }

  private getKubernetesConfig(type: string): Record<string, any> {
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      namespace: 'default',
      resources: {
        requests: {
          memory: '256Mi',
          cpu: '250m',
        },
        limits: {
          memory: '512Mi',
          cpu: '500m',
        },
      },
    };
  }

  private getDockerConfig(type: string): Record<string, any> {
    return {
      buildContext: '.',
      ports: type === 'nextjs' ? [3000] : [3000],
      environment: {
        NODE_ENV: 'production',
      },
    };
  }

  private getVPSConfig(type: string): Record<string, any> {
    return {
      systemd: true,
      nginx: true,
      ssl: true,
      pm2: true,
    };
  }

  private generateKubernetesManifest(type: string): string {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
      - name: app
        image: app:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  selector:
    app: app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
`;
  }

  private generateDockerCompose(type: string): string {
    return `version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
    restart: unless-stopped
`;
  }

  private generateSetupScript(type: string): string {
    return `#!/bin/bash

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Setup Nginx
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Clone repository and install dependencies
cd /opt
sudo git clone [repository-url] app
cd app
sudo npm install --production

# Start with PM2
sudo pm2 start app.js --name "app"
sudo pm2 startup
sudo pm2 save
`;
  }
}