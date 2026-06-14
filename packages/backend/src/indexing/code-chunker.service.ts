import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CodeChunk {
  content: string;
  startLine: number;
  endLine: number;
  chunkType: 'function' | 'class' | 'import' | 'generic';
  name?: string;
  language: string;
}

@Injectable()
export class CodeChunkerService {
  private readonly logger = new Logger(CodeChunkerService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Chunk code file into semantic chunks
   */
  chunkCode(
    content: string,
    language: string,
    filePath: string,
  ): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');

    const strategy = this.configService.get('repo.chunking.chunkingStrategy');

    if (strategy === 'ast') {
      return this.chunkByAST(content, language, filePath);
    } else if (strategy === 'semantic') {
      return this.chunkBySemantic(content, language, lines);
    } else {
      return this.chunkByLines(content, language, lines);
    }
  }

  /**
   * Chunk by AST (Abstract Syntax Tree)
   */
  private chunkByAST(
    content: string,
    language: string,
    filePath: string,
  ): CodeChunk[] {
    const chunks: CodeChunk[] = [];

    // Language-specific AST parsing
    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.parseJavaScript(content);
      case 'python':
        return this.parsePython(content);
      case 'java':
        return this.parseJava(content);
      default:
        return this.chunkByLines(content, language, content.split('\n'));
    }
  }

  /**
   * Parse JavaScript/TypeScript file
   */
  private parseJavaScript(content: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');

    // Simple regex-based parsing (in production, use a proper AST parser like @babel/parser)
    const functionRegex = /^\s*(async\s+)?(function|const|let|var)\s+(\w+)\s*[=\(]/gm;
    const classRegex = /^\s*(export\s+)?(abstract\s+)?class\s+(\w+)/gm;
    const importRegex = /^(import|require)\s+(.+)/gm;

    let match;

    // Find imports
    importRegex.lastIndex = 0;
    while ((match = importRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length - 1;
      chunks.push({
        content: match[0],
        startLine: lineNum,
        endLine: lineNum,
        chunkType: 'import',
        language: 'javascript',
      });
    }

    // Find classes
    classRegex.lastIndex = 0;
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[3];
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      const classBlock = this.findBlockEnd(content, match.index);
      const endLine = startLine + classBlock.split('\n').length - 1;

      chunks.push({
        content: classBlock,
        startLine,
        endLine,
        chunkType: 'class',
        name: className,
        language: 'javascript',
      });
    }

    // Find functions
    functionRegex.lastIndex = 0;
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[3];
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      const funcBlock = this.findBlockEnd(content, match.index);
      const endLine = startLine + funcBlock.split('\n').length - 1;

      chunks.push({
        content: funcBlock,
        startLine,
        endLine,
        chunkType: 'function',
        name: funcName,
        language: 'javascript',
      });
    }

    return chunks;
  }

  /**
   * Parse Python file (stub)
   */
  private parsePython(content: string): CodeChunk[] {
    // Implementation similar to JavaScript
    return this.chunkByLines(content, 'python', content.split('\n'));
  }

  /**
   * Parse Java file (stub)
   */
  private parseJava(content: string): CodeChunk[] {
    // Implementation similar to JavaScript
    return this.chunkByLines(content, 'java', content.split('\n'));
  }

  /**
   * Chunk by semantic boundaries (blank lines, comments)
   */
  private chunkBySemantic(
    content: string,
    language: string,
    lines: string[],
  ): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    let currentChunk = '';
    let startLine = 0;

    const targetSize = this.configService.get('repo.chunking.targetChunkSize');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentChunk += line + '\n';

      // Check if we should end chunk
      const isBlankLine = line.trim() === '';
      const isCommentLine = line.trim().startsWith('//') || line.trim().startsWith('#');
      const isLargeChunk = currentChunk.length > targetSize;

      if ((isBlankLine || isCommentLine || isLargeChunk) && currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          startLine,
          endLine: i,
          chunkType: 'generic',
          language,
        });

        currentChunk = '';
        startLine = i + 1;
      }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        startLine,
        endLine: lines.length - 1,
        chunkType: 'generic',
        language,
      });
    }

    return chunks;
  }

  /**
   * Chunk by fixed line size
   */
  private chunkByLines(
    content: string,
    language: string,
    lines: string[],
  ): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const chunkSize = this.configService.get('repo.chunking.targetChunkSize');

    for (let i = 0; i < lines.length; i += chunkSize) {
      const endIdx = Math.min(i + chunkSize, lines.length);
      const chunkLines = lines.slice(i, endIdx);

      chunks.push({
        content: chunkLines.join('\n'),
        startLine: i,
        endLine: endIdx - 1,
        chunkType: 'generic',
        language,
      });
    }

    return chunks;
  }

  /**
   * Find block end (matching braces)
   */
  private findBlockEnd(content: string, startIdx: number): string {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let foundStart = false;

    for (let i = startIdx; i < content.length; i++) {
      const char = content[i];

      if (inString) {
        if (char === stringChar && content[i - 1] !== '\\') {
          inString = false;
        }
      } else {
        if (char === '"' || char === "'" || char === '`') {
          inString = true;
          stringChar = char;
        } else if (char === '{') {
          foundStart = true;
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (foundStart && braceCount === 0) {
            return content.substring(startIdx, i + 1);
          }
        }
      }
    }

    return content.substring(startIdx);
  }
}
