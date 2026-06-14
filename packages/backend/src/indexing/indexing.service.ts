import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CodeChunkerService } from './code-chunker.service';
import { DependencyMapperService } from './dependency-mapper.service';
import { MetadataExtractorService } from '@/ingestion/metadata-extractor.service';

@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);

  constructor(
    private prisma: PrismaService,
    private chunker: CodeChunkerService,
    private dependencyMapper: DependencyMapperService,
    private metadataExtractor: MetadataExtractorService,
  ) {}

  /**
   * Index repository files
   */
  async indexRepository(repoId: string, filePaths: Array<{ path: string; content: string; language: string }>) {
    let filesProcessed = 0;
    let totalChunks = 0;

    for (const file of filePaths) {
      try {
        await this.indexFile(repoId, file.path, file.content, file.language);
        filesProcessed++;
      } catch (error) {
        this.logger.error(`Failed to index file ${file.path}: ${error.message}`);
      }
    }

    // Update repository stats
    const chunks = await this.prisma.codeChunk.count({ where: { repoId } });
    const files = await this.prisma.repoFile.count({ where: { repoId } });
    const lines = await this.prisma.repoFile.aggregate({
      where: { repoId },
      _sum: { lineCount: true },
    });

    await this.prisma.repository.update({
      where: { id: repoId },
      data: {
        totalFiles: files,
        totalLines: lines._sum.lineCount || 0,
        totalChunks: chunks,
      },
    });

    return { filesProcessed, totalChunks: chunks };
  }

  /**
   * Index individual file
   */
  private async indexFile(repoId: string, filePath: string, content: string, language: string) {
    // Extract metadata
    const metadata = await this.metadataExtractor.extract(content, language);

    // Create file record
    const file = await this.prisma.repoFile.create({
      data: {
        repoId,
        path: filePath,
        name: filePath.split('/').pop() || filePath,
        language,
        size: content.length,
        lineCount: content.split('\n').length,
        content: content.length < 100000 ? content : null, // Store content only if < 100KB
        contentHash: this.hashContent(content),
        functions: metadata.functions,
        classes: metadata.classes,
        imports: metadata.imports,
        exports: metadata.exports,
      },
    });

    // Chunk code
    const chunks = this.chunker.chunkCode(content, language, filePath);

    // Create code chunks
    for (const chunk of chunks) {
      await this.prisma.codeChunk.create({
        data: {
          repoId,
          fileId: file.id,
          content: chunk.content,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          chunkType: chunk.chunkType,
          name: chunk.name,
          language: chunk.language,
          metadata: {
            functions: metadata.functions,
            classes: metadata.classes,
          },
        },
      });
    }

    // Map dependencies
    await this.dependencyMapper.mapFileDependencies(repoId, file.id, metadata.imports);

    this.logger.log(`Indexed file: ${filePath} (${chunks.length} chunks)`);
  }

  /**
   * Hash file content for change detection
   */
  private hashContent(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
