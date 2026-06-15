# Setup Infrastructure Database
cd packages/backend
npx prisma migrate dev --name add-infrastructure-system
npx prisma generate

# Install Kubernetes client
pnpm add @kubernetes/client-node

# Install AWS SDK
pnpm add aws-sdk

# Start Services
# Terminal 1: Infrastructure Worker
cd packages/backend
pnpm queue:worker:infrastructure

# Terminal 2: Backend with WebSocket
cd packages/backend
pnpm start:dev

# Terminal 3: Frontend
cd packages/frontend
pnpm dev

# Configure Kubernetes Access
mkdir -p /etc/kubernetes/clusters
# Copy your kubeconfig files to /etc/kubernetes/clusters/

# Access URLs
# Frontend: http://localhost:3000
# Infrastructure Dashboard: http://localhost:3000/infrastructure
# Cluster Management: http://localhost:3000/infrastructure/clusters
# Deployments: http://localhost:3000/infrastructure/deployments
# Scaling Policies: http://localhost:3000/infrastructure/scaling
# Backend API: http://localhost:3001
# WebSocket: ws://localhost:3001/infrastructure
