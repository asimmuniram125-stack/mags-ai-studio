import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider, CompletionOptions, AIResponse, AIStreamToken } from './ai-provider.interface';
import fetch from 'node-fetch';
import { encodingForModel } from 'js-tiktoken';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get('ai.openai.apiKey') || '';
    this.baseUrl = this.configService.get('ai.openai.baseUrl') || 'https://api.openai.com/v1';
    this.defaultModel = this.configService.get('ai.openai.model') || 'gpt-4';
  }

  async complete(options: CompletionOptions): Promise<AIResponse> {
    const messages = [
      { role: 'system' as const, content: options.systemPrompt || '' },
      { role: 'user' as const, content: options.messages[0]?.content || '' },
    ];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.modelId || this.defaultModel,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        top_p: options.topP || 1.0,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    return {
      content: data.choices[0].message.content,
      model: data.model,
      tokens: data.usage.total_tokens,
      finishReason: data.choices[0].finish_reason,
    };
  }

  async *streamCompletion(options: CompletionOptions): AsyncGenerator<AIStreamToken> {
    const messages = [
      { role: 'system' as const, content: options.systemPrompt || '' },
      { role: 'user' as const, content: options.messages[0]?.content || '' },
    ];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.modelId || this.defaultModel,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        top_p: options.topP || 1.0,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    // Handle ReadableStream for Node.js environment
    const reader = (response.body as any)?.getReader?.() || (response.body as any)?.reader?.();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n').filter((line: string) => line.trim());

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const json = JSON.parse(data);
            if (json.choices[0].delta.content) {
              yield {
                token: json.choices[0].delta.content,
                timestamp: Date.now(),
              };
            }
          } catch (e) {
            // Parse error
          }
        }
      }

      buffer = lines[lines.length - 1];
    }
  }

  estimateTokens(text: string): number {
    try {
      const enc = encodingForModel(this.defaultModel as any);
      return enc.encode(text).length;
    } catch {
      return Math.ceil(text.length / 4);
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  }
}
