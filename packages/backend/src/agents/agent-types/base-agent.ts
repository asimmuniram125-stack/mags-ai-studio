import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BaseAgent {
  protected readonly logger = new Logger(BaseAgent.name);
  protected aiService: any;
  protected actions: any[] = [];

  constructor() {}

  async execute(context: any): Promise<any> {
    try {
      this.logger.log('Executing base agent');
      return { result: 'success' };
    } catch (error) {
      this.logger.error(`Task execution failed: ${(error as Error).message}`);
      throw error;
    }
  }

  protected async executeSteps(steps: any[]): Promise<any[]> {
    const results: any[] = [];
    for (let i = 0; i < steps.length; i++) {
      try {
        const result = await this.executeStep(steps[i]);
        results.push(result);
      } catch (error) {
        this.logger.error(`Step ${i + 1} failed: ${(error as Error).message}`);
        throw error;
      }
    }
    return results;
  }

  protected async executeStep(step: any): Promise<any> {
    return step;
  }

  protected addAction(type: string, name: string, params: any, prompt: string): void {
    this.actions.push({ type, name, params, prompt, timestamp: Date.now() });
  }
}
