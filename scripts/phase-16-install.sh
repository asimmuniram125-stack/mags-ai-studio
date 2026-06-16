#!/bin/bash
# Phase 16 Installation Script

set -e

echo "🚀 MAGS AI Studio - Phase 16 Installation"
echo "=========================================="

# 1. Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# 2. Build all packages
echo "🔨 Building packages..."
pnpm build

# 3. Setup database
echo "🗄️ Setting up database..."
cd packages/backend
npx prisma generate
npx prisma db push
npx prisma db seed
cd ../..

# 4. Run migrations
echo "🔄 Running Phase 16 migrations..."
cd packages/backend
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/phase-16/001_feature_flags.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/phase-16/002_releases.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/phase-16/003_onboarding.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/phase-16/004_documentation.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/phase-16/005_feedback.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/phase-16/006_platform_status.sql
cd ../..

# 5. Run tests
echo "🧪 Running tests..."
pnpm test:cov
pnpm test:load

# 6. Security scans
echo "🔐 Running security scans..."
snyk test --severity-threshold=high
npm-check-updates

# 7. Build Docker images
echo "🐳 Building Docker images..."
docker build -f docker/backend.dockerfile -t mags-backend:16.0.0 .
docker build -f docker/frontend.dockerfile -t mags-frontend:16.0.0 .

# 8. Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# 9. Verify health
echo "✅ Verifying system health..."
sleep 10
curl -f http://localhost:3001/health || exit 1
curl -f http://localhost:3000 || exit 1

echo ""
echo "✨ Phase 16 Installation Complete!"
echo ""
echo "🌐 Access the platform:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo "   API Docs: http://localhost:3001/api/docs"
echo ""
echo "📊 Monitoring:"
echo "   Grafana: http://localhost:3000/monitoring"
echo "   Prometheus: http://localhost:9090"
echo ""
