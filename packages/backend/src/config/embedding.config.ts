import { registerAs } from '@nestjs/config';

export default registerAs('embedding', () => ({
  // Embedding model
  model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  provider: process.env.EMBEDDING_PROVIDER || 'openai',
  
  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },

  // Vector store
  vectorStore: {
    type: process.env.VECTOR_STORE_TYPE || 'pgvector', // pgvector, pinecone, weaviate
    dimension: parseInt(process.env.EMBEDDING_DIMENSION || '1536'),
  },

  // Similarity search
  search: {
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7'),
    topK: parseInt(process.env.SEARCH_TOP_K || '10'),
    useHybridSearch: process.env.USE_HYBRID_SEARCH === 'true',
  },

  // Caching
  cache: {
    enabled: process.env.EMBEDDING_CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.EMBEDDING_CACHE_TTL || '86400'), // 24 hours
  },
}));
