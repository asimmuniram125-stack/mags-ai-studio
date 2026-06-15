import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

interface BackupConfig {
  frequency: 'hourly' | 'daily' | 'weekly';
  retention: number; // days
  storageLocation: string;
  includeDatabase: boolean;
  includeConfigs: boolean;
  includeDeployments: boolean;
}

@Injectable()
export class BackupService {
  private backupConfigs: BackupConfig = {
    frequency: 'daily',
    retention: 30,
    storageLocation: process.env.BACKUP_STORAGE || '/backups',
    includeDatabase: true,
    includeConfigs: true,
    includeDeployments: true,
  };

  async createFullBackup(): Promise<{ backupId: string; size: number; timestamp: number }> {
    const backupId = this.generateBackupId();
    const backupDir = path.join(this.backupConfigs.storageLocation, backupId);

    await fs.mkdir(backupDir, { recursive: true });

    const backup = {
      backupId,
      timestamp: Date.now(),
      database: null as any,
      configs: null as any,
      deployments: null as any,
      checksum: '',
    };

    // Backup database
    if (this.backupConfigs.includeDatabase) {
      backup.database = await this.backupDatabase(backupDir);
    }

    // Backup configurations
    if (this.backupConfigs.includeConfigs) {
      backup.configs = await this.backupConfigurations(backupDir);
    }

    // Backup deployment info
    if (this.backupConfigs.includeDeployments) {
      backup.deployments = await this.backupDeployments(backupDir);
    }

    // Create backup manifest
    backup.checksum = this.calculateChecksum(backup);
    await fs.writeFile(
      path.join(backupDir, 'manifest.json'),
      JSON.stringify(backup, null, 2),
    );

    const size = await this.calculateBackupSize(backupDir);
    return { backupId, size, timestamp: backup.timestamp };
  }

  private async backupDatabase(backupDir: string): Promise<{
    file: string;
    size: number;
  }> {
    return new Promise((resolve, reject) => {
      const backupFile = path.join(backupDir, 'database.sql');
      const dumpCommand = spawn('pg_dump', [
        `-h${process.env.DB_HOST}`,
        `-U${process.env.DB_USER}`,
        `-d${process.env.DB_NAME}`,
        `-Fp`,
        `-f${backupFile}`,
      ]);

      dumpCommand.on('close', (code) => {
        if (code === 0) {
          resolve({ file: backupFile, size: 0 });
        } else {
          reject(new Error(`pg_dump failed with code ${code}`));
        }
      });
    });
  }

  private async backupConfigurations(backupDir: string): Promise<{
    files: string[];
    count: number;
  }> {
    const configFiles = ['.env', '.env.production', 'config/*'];
    const backupedFiles: string[] = [];

    for (const pattern of configFiles) {
      // Copy config files
      const configFile = path.join(process.cwd(), pattern);
      const backupFile = path.join(backupDir, 'configs', pattern);

      try {
        await fs.mkdir(path.dirname(backupFile), { recursive: true });
        await fs.copyFile(configFile, backupFile);
        backupedFiles.push(backupFile);
      } catch (e) {
        // File may not exist
      }
    }

    return { files: backupedFiles, count: backupedFiles.length };
  }

  private async backupDeployments(backupDir: string): Promise<{
    file: string;
    deployments: number;
  }> {
    const deploymentFile = path.join(backupDir, 'deployments.json');
    const deployments = [
      {
        id: 'current',
        timestamp: Date.now(),
        version: process.env.APP_VERSION,
        hash: process.env.COMMIT_HASH,
      },
    ];

    await fs.writeFile(deploymentFile, JSON.stringify(deployments, null, 2));
    return { file: deploymentFile, deployments: deployments.length };
  }

  private calculateChecksum(obj: any): string {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(obj))
      .digest('hex');
  }

  private async calculateBackupSize(dir: string): Promise<number> {
    let size = 0;

    const files = await fs.readdir(dir, { recursive: true });
    for (const file of files) {
      const filePath = path.join(dir, file as string);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        size += stat.size;
      }
    }

    return size;
  }

  private generateBackupId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `backup_${timestamp}_${random}`;
  }

  async pruneOldBackups(): Promise<{ removed: number; freedSpace: number }> {
    const backupDir = this.backupConfigs.storageLocation;
    const backups = await fs.readdir(backupDir);
    const cutoffTime = Date.now() - this.backupConfigs.retention * 24 * 60 * 60 * 1000;

    let removed = 0;
    let freedSpace = 0;

    for (const backup of backups) {
      const backupPath = path.join(backupDir, backup);
      const stat = await fs.stat(backupPath);

      if (stat.mtimeMs < cutoffTime) {
        const size = await this.calculateBackupSize(backupPath);
        await fs.rm(backupPath, { recursive: true, force: true });
        removed++;
        freedSpace += size;
      }
    }

    return { removed, freedSpace };
  }
}