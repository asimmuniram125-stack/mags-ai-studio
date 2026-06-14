export class RepositoryResponseDto {
  id: string;
  name: string;
  description?: string;
  source: string;
  indexStatus: string;
  indexProgress: number;
  totalFiles: number;
  totalLines: number;
  totalChunks: number;
  createdAt: Date;
}
