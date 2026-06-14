import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { EnvironmentConfig, Environment } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class EnvironmentService {
  private readonly logger = new Logger(EnvironmentService.name);
  private readonly encryptionKey = process.env.ENCRYPTION_KEY || 'default-unsafe-key';

  constructor(private prisma: PrismaService) {}

  async createEnvironmentConfig(
    projectId: string,
    environment: Environment,
    variables: Record<string, string>,
  ): Promise<EnvironmentConfig> {
    this.logger.log(`Creating environment config: ${projectId} - ${environment}`);

    const config = await this.prisma.environmentConfig.create({
      data: {
        projectId,
        environment,
        variables: {
          create: Object.entries(variables).map(([key, value]) => ({
            key,
            value,
            isEncrypted: false,
          })),
        },
      },
      include: { variables: true },
    });

    return config;
  }

  async addSecret(
    projectId: string,
    environment: Environment,
    key: string,
    value: string,
  ): Promise<void> {
    this.logger.log(`Adding secret: ${projectId} - ${environment} - ${key}`);

    const config = await this.prisma.environmentConfig.findFirst({
      where: { projectId, environment },
    });

    if (!config) {
      throw new Error(`Environment config not found: ${projectId} - ${environment}`);
    }

    const encrypted = this.encryptSecret(value);

    await this.prisma.environmentSecret.create({
      data: {
        configId: config.id,
        key,
        encryptedValue: encrypted.encryptedValue,
        metadata: {
          iv: encrypted.iv,
          salt: encrypted.salt,
        },
      },
    });
  }

  async getEnvironmentVariables(
    projectId: string,
    environment: Environment,
  ): Promise<Record<string, string>> {
    const config = await this.prisma.environmentConfig.findFirst({
      where: { projectId, environment },
      include: { variables: true, secrets: true },
    });

    if (!config) {
      return {};
    }

    const vars: Record<string, string> = {};

    // Add regular variables
    for (const variable of config.variables) {
      vars[variable.key] = variable.value;
    }

    // Add secrets
    for (const secret of config.secrets) {
      vars[secret.key] = this.decryptSecret(secret.encryptedValue, secret.metadata);
    }

    return vars;
  }

  private encryptSecret(
    value: string,
  ): { encryptedValue: string; iv: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const iv = crypto.randomBytes(16).toString('hex');
    const key = crypto
      .pbkdf2Sync(this.encryptionKey, salt, 1000, 32, 'sha256')
      .toString('hex');

    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    let encryptedValue = cipher.update(value, 'utf-8', 'hex');
    encryptedValue += cipher.final('hex');

    return { encryptedValue, iv, salt };
  }

  private decryptSecret(encryptedValue: string, metadata: any): string {
    const { iv, salt } = metadata;
    const key = crypto
      .pbkdf2Sync(this.encryptionKey, salt, 1000, 32, 'sha256')
      .toString('hex');

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'hex'),
      Buffer.from(iv, 'hex'),
    );
    let decryptedValue = decipher.update(encryptedValue, 'hex', 'utf-8');
    decryptedValue += decipher.final('utf-8');

    return decryptedValue;
  }
}