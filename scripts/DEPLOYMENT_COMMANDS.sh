#!/bin/bash

# MAGS AI Studio - Production Deployment Commands
# Phase 15: Production Hardening & Final Optimization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== MAGS AI Studio - Production Deployment ===${NC}"

# Build and test
echo -e "${YELLOW}[1/6] Installing dependencies...${NC}"
pnpm install

echo -e "${YELLOW}[2/6] Building application...${NC}"
pnpm build

echo -e "${YELLOW}[3/6] Running tests...${NC}"
pnpm test:cov
pnpm test:load
pnpm test:stress

echo -e "${YELLOW}[4/6] Running security scans...${NC}"
snyk test --severity-threshold=high
dependency-check --scan .

echo -e "${YELLOW}[5/6] Building Docker images...${NC}"
docker build -f docker/backend.dockerfile -t mags-backend:15.0.0 .
docker build -f docker/frontend.dockerfile -t mags-frontend:15.0.0 .

echo -e "${YELLOW}[6/6] Pushing Docker images...${NC}"
docker push registry.example.com/mags-backend:15.0.0
docker push registry.example.com/mags-frontend:15.0.0

# Deploy to production
echo -e "${GREEN}=== Deploying to Production ===${NC}"
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
./scripts/health-check.sh
curl https://api.mags-ai.com/health
curl https://mags-ai.com

# Monitor
echo -e "${GREEN}=== Monitoring Deployment ===${NC}"
echo -e "${YELLOW}Backend logs:${NC}"
docker-compose logs -f backend &

echo -e "${YELLOW}Frontend logs:${NC}"
docker-compose logs -f frontend &

# Backup before going live
echo -e "${GREEN}=== Backup Systems ===${NC}"
./scripts/backup-automation.sh

echo -e "${GREEN}✅ Deployment Complete!${NC}"