import { registerAs } from '@nestjs/config';

export default registerAs('repo', () => ({
  // GitHub configuration
  github: {
    token: process.env.GITHUB_TOKEN,
    baseUrl: 'https://api.github.com',
  },

  // Indexing configuration
  indexing: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '1048576'), // 1MB
    maxFilesPerRepo: parseInt(process.env.MAX_FILES_PER_REPO || '100000'),
    supportedLanguages: (process.env.SUPPORTED_LANGUAGES || 
      'js,ts,jsx,tsx,py,java,go,rs,c,cpp,cs,rb,php,swift,kt'
    ).split(','),
    ignorePatterns: (process.env.IGNORE_PATTERNS || 
      'node_modules,dist,build,.git,venv,__pycache__,.env'
    ).split(','),
  },

  // Chunking configuration
  chunking: {
    targetChunkSize: parseInt(process.env.TARGET_CHUNK_SIZE || '1000'), // lines or characters
    overlapSize: parseInt(process.env.OVERLAP_SIZE || '200'),
    chunkingStrategy: process.env.CHUNKING_STRATEGY || 'semantic', // ast, semantic, line-based
  },

  // Processing configuration
  processing: {
    maxConcurrentFiles: parseInt(process.env.MAX_CONCURRENT_FILES || '10'),
    maxConcurrentEmbeddings: parseInt(process.env.MAX_CONCURRENT_EMBEDDINGS || '5'),
    batchSize: parseInt(process.env.BATCH_SIZE || '10'),
  },

  // Upload configuration
  upload: {
    maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '104857600'), // 100MB
    uploadDir: process.env.UPLOAD_DIR || '/tmp/repo-uploads',
  },
}));
