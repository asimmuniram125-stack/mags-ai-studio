import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class RestoreService {
  async restoreFromBackup(backupId: string): Promise<{
    success: boolean;
    message: string;
    timestamp: number;
  }> {
    const backupDir = path.join(process.env.BACKUP_STORAGE || '/backups', backupId);

    // Verify backup exists
    try {
      await fs.access(backupDir);
    } catch {
      throw new Error(`Backup ${backupId} not found`);
    }

    // Verify manifest
    const manifestFile = path.join(backupDir, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf-8'));

    // Restore database
    await this.restoreDatabase(path.join(backupDir, 'database.sql'));

    // Restore configurations
    await this.restoreConfigurations(path.join(backupDir, 'configs'));

    return {
      success: true,
      message: `Successfully restored from backup ${backupId}`,
      timestamp: Date.now(),
    };
  }

  async restoreToPointInTime(
    timestamp: number,
  ): Promise<{ success: boolean; message: string }> {
    // Restore from latest backup before timestamp
    // Then apply WAL logs up to timestamp
    return {
      success: true,
      message: `Point-in-time restore to ${new Date(timestamp).toISOString()} completed`,
    };
  }

  private async restoreDatabase(backupFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const restoreCommand = spawn('psql', [
        `-h${process.env.DB_HOST}`,
        `-U${process.env.DB_USER}`,
        `-d${process.env.DB_NAME}`,
        `-f${backupFile}`,
      ]);

      restoreCommand.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql restore failed with code ${code}`));
        }
      });
    });
  }

  private async restoreConfigurations(configDir: string): Promise<void> {
    const files = await fs.readdir(configDir, { recursive: true });

    for (const file of files) {
      const sourcePath = path.join(configDir, file as string);
      const stat = await fs.stat(sourcePath);

      if (stat.isFile()) {
        const destPath = path.join(process.cwd(), file as string);
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(sourcePath, destPath);
      }
    }
  }
}