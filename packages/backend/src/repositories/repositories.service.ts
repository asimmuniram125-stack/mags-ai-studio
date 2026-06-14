import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { RepositoryQueueService } from '@/queue/repository-queue.service';
import { IngestionService } from '@/ingestion/ingestion.service';
import { ImportRepoDto } from './dto/import-repo.dto';

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private queueService: RepositoryQueueService,
    private ingestionService: IngestionService,
    private configService: ConfigService,
  ) {}

  /**
   * Import repository from GitHub
   */
  async importRepository(userId: string, importDto: ImportRepoDto) {
    const { url, name, description } = importDto;

    // Extract owner/repo from GitHub URL
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(\.git)?$/);
    if (!match) {
      throw new BadRequestException('Invalid GitHub URL');
    }

    const [, owner, repo] = match;

    // Check if already imported
    const existing = await this.prisma.repository.findFirst({
      where: { userId, owner, name: repo },
    });

    if (existing) {
      throw new ConflictException('Repository already imported');
    }

    // Create repository record
    const repository = await this.prisma.repository.create({
      data: {
        userId,
        name: name || repo,
        description,
        url,
        source: 'github',
        owner,
        indexStatus: 'pending',
      },
    });

    // Queue ingestion job
    await this.queueService.addIngestionJob({
      repoId: repository.id,
      userId,
      source: 'github',
      url,
      owner,
      repo,
    });

    this.logger.log(`Repository import queued: ${repository.id}`);

    return {
      id: repository.id,
      name: repository.name,
      status: 'pending',
      message: 'Repository import queued. Indexing will start shortly.',
    };
  }

  /**
   * Upload local repository
   */
  async uploadRepository(userId: string, file: Express.Multer.File) {
    // Extract and create repository
    const repository = await this.prisma.repository.create({
      data: {
        userId,
        name: file.originalname.replace(/\.(zip|tar\.gz)$/, ''),
        source: 'local',
        indexStatus: 'pending',
      },
    });

    // Queue ingestion
    await this.queueService.addIngestionJob({
      repoId: repository.id,
      userId,
      source: 'local',
      filePath: file.path,
      fileName: file.originalname,
    });

    return {
      id: repository.id,
      name: repository.name,
      status: 'pending',
    };
  }

  /**
   * Get repository
   */
  async getRepository(repoId: string, userId: string) {
    const repo = await this.prisma.repository.findUnique({
      where: { id: repoId },
      include: {
        files: { select: { id: true, path: true, language: true } },
        _count: {
          select: {
            chunks: true,
            embeddings: true,
            graphNodes: true,
            graphEdges: true,
          },
        },
      },
    });

    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    if (repo.userId !== userId) {
      throw new BadRequestException('Unauthorized access');
    }

    return repo;
  }

  /**
   * Get user repositories
   */
  async getUserRepositories(userId: string) {
    const repos = await this.prisma.repository.findMany({
      where: { userId, isArchived: false },
      select: {
        id: true,
        name: true,
        description: true,
        source: true,
        language: true,
        indexStatus: true,
        indexProgress: true,
        lastIndexedAt: true,
        totalFiles: true,
        totalLines: true,
        totalChunks: true,
        createdAt: true,
        _count: {
          select: { files: true, chunks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return repos;
  }

  /**
   * Get repository structure
   */
  async getRepositoryStructure(repoId: string, userId: string) {
    const repo = await this.getRepository(repoId, userId);

    // Build file tree
    const files = await this.prisma.repoFile.findMany({
      where: { repoId },
      select: {
        id: true,
        path: true,
        language: true,
        lineCount: true,
        size: true,
        functions: true,
        classes: true,
      },
    });

    const tree = this.buildFileTree(files);

    return {
      id: repo.id,
      name: repo.name,
      fileTree: tree,
      statistics: {
        totalFiles: repo.totalFiles,
        totalLines: repo.totalLines,
        totalChunks: repo.totalChunks,
        languages: await this.getLanguageStats(repoId),
      },
    };
  }

  /**
   * Get file content
   */
  async getFileContent(repoId: string, fileId: string, userId: string) {
    const repo = await this.getRepository(repoId, userId);

    const file = await this.prisma.repoFile.findUnique({
      where: { id: fileId },
      include: { chunks: { orderBy: { startLine: 'asc' } } },
    });

    if (!file || file.repoId !== repoId) {
      throw new NotFoundException('File not found');
    }

    return {
      id: file.id,
      path: file.path,
      name: file.name,
      language: file.language,
      content: file.content,
      lineCount: file.lineCount,
      functions: file.functions,
      classes: file.classes,
      chunks: file.chunks,
    };
  }

  /**
   * Delete repository
   */
  async deleteRepository(repoId: string, userId: string) {
    const repo = await this.getRepository(repoId, userId);

    await this.prisma.repository.update({
      where: { id: repoId },
      data: { isArchived: true },
    });

    // Clear cache
    await this.redisService.delete(`repo:${repoId}:structure`);

    return { message: 'Repository archived successfully' };
  }

  /**
   * Build file tree from files
   */
  private buildFileTree(files: any[]): any {
    const root: any = { name: 'root', children: [] };

    for (const file of files) {
      const parts = file.path.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;

        if (!isFile) {
          // Directory
          let dir = current.children.find((c: any) => c.name === part && c.children);
          if (!dir) {
            dir = { name: part, children: [], type: 'dir' };
            current.children.push(dir);
          }
          current = dir;
        } else {
          // File
          current.children.push({
            id: file.id,
            name: part,
            type: 'file',
            language: file.language,
            path: file.path,
            lineCount: file.lineCount,
            size: file.size,
          });
        }
      }
    }

    return root.children;
  }

  /**
   * Get language statistics
   */
  private async getLanguageStats(repoId: string) {
    const stats = await this.prisma.repoFile.groupBy({
      by: ['language'],
      where: { repoId },
      _count: { id: true },
    });

    return stats.map((s) => ({
      language: s.language || 'unknown',
      count: s._count.id,
    }));
  }
}
