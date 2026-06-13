import { Injectable } from '@nestjs/common';
import { AIService } from '@/ai/ai.service';
import { BaseAgent } from './base-agent';
import { TaskExecutionContext } from '../interfaces/task.interface';

@Injectable()
export class CodingAgent extends BaseAgent {
  constructor(private aiService: AIService) {
    super();
  }

  protected async executeStep(step: any): Promise<any> {
    if (step.type === 'write_code') {
      return await this.writeCode(step);
    } else if (step.type === 'analyze_code') {
      return await this.analyzeCode(step);
    } else if (step.type === 'refactor_code') {
      return await this.refactorCode(step);
    }

    return super.executeStep(step);
  }

  private async writeCode(step: any): Promise<any> {
    const prompt = `
      Write ${step.language || 'JavaScript'} code for:
      ${step.description}
      
      Requirements:
      - Follow best practices
      - Include comments
      - Handle errors
      - Make it production-ready
      
      Return the code in a markdown code block.
    `;

    const response = await this.aiService.complete({
      messages: [{ role: 'user', content: prompt }],
      modelId: 'gpt-4',
      temperature: 0.3,
      maxTokens: 3000,
    });

    this.addAction('tool_call', 'write_code', { language: step.language }, prompt);

    return {
      type: 'code',
      language: step.language,
      code: this.extractCode(response.content),
    };
  }

  private async analyzeCode(step: any): Promise<any> {
    const prompt = `
      Analyze this code:
      ${step.code}
      
      Provide analysis including:
      - Potential bugs
      - Performance issues
      - Security concerns
      - Improvement suggestions
    `;

    const response = await this.aiService.complete({
      messages: [{ role: 'user', content: prompt }],
      modelId: 'gpt-4',
      temperature: 0.5,
      maxTokens: 2000,
    });

    return {
      type: 'analysis',
      analysis: response.content,
    };
  }

  private async refactorCode(step: any): Promise<any> {
    const prompt = `
      Refactor this code:
      ${step.code}
      
      Focus on:
      ${step.focus || '- Readability\n- Performance\n- Best practices'}
      
      Return the refactored code.
    `;

    const response = await this.aiService.complete({
      messages: [{ role: 'user', content: prompt }],
      modelId: 'gpt-4',
      temperature: 0.3,
      maxTokens: 3000,
    });

    return {
      type: 'refactored_code',
      code: this.extractCode(response.content),
    };
  }

  private extractCode(text: string): string {
    const match = text.match(/```(?:js|javascript|ts|typescript)?\n([\s\S]*?)```/);
    return match ? match[1] : text;
  }
}
