import { Injectable } from '@nestjs/common';

@Injectable()
export class DockerfileGenerator {
  generateDockerfile(appType: string, appConfig: any): string {
    switch (appType) {
      case 'nextjs':
        return this.generateNextjsDockerfile(appConfig);
      case 'nestjs':
        return this.generateNestjsDockerfile(appConfig);
      case 'node':
        return this.generateNodeDockerfile(appConfig);
      case 'python':
        return this.generatePythonDockerfile(appConfig);
      default:
        return this.generateNodeDockerfile(appConfig);
    }
  }

  private generateNextjsDockerfile(config: any): string {
    return `# Next.js Production Build
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
`;
  }

  private generateNestjsDockerfile(config: any): string {
    return `# NestJS Production Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
`;
  }

  private generateNodeDockerfile(config: any): string {
    return `# Node.js Production Build
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
`;
  }

  private generatePythonDockerfile(config: any): string {
    return `# Python Production Build
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
`;
  }

  generateDockerCompose(services: any[]): string {
    const serviceConfigs = services
      .map((s) => {
        return `  ${s.name}:
    image: ${s.image}
    ports:
      - "${s.port}:${s.containerPort}"
    environment:
      ${Object.entries(s.env || {})
        .map(([k, v]) => `- ${k}=${v}`)
        .join('\n      ')}
    ${s.volumes ? `volumes:\n      ${s.volumes.map((v) => `- ${v}`).join('\n      ')}` : ''}`;
      })
      .join('\n\n');

    return `version: '3.8'

services:
${serviceConfigs}
`;
  }
}