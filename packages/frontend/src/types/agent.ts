export interface Agent {
  id: string;
  userId: string;
  name: string;
  type: string; // coding, research, data_analyst, etc.
  description?: string;
  modelId: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  tools: string[];
  permissions: string[];
  isActive: boolean;
  isPublic: boolean;
  taskCount: number;
  totalTokens: number;
  successRate: number;
  avatar?: string;
  color?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentPayload {
  name: string;
  type: string;
  description?: string;
  modelId?: string;
  systemPrompt?: string;
  tools?: string[];
}
