import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AgentExecutorService } from '@/agents/agent-executor.service';
import { AgentQueueService } from '@/queue/agent-queue.service';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private prisma: PrismaService,
    private agentExecutor: AgentExecutorService,
    private queueService: AgentQueueService,
  ) {}

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowId: string, userId: string): Promise<string> {
    const workflow = await this.prisma.agentWorkflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    // Validate workflow structure
    this.validateWorkflow(workflow);

    // Create execution record
    const execution = await this.prisma.agentWorkflowExecution.create({
      data: {
        workflowId,
        status: 'running',
      },
    });

    // Queue execution
    await this.queueService.addWorkflow({
      executionId: execution.id,
      workflowId,
      userId,
      nodes: workflow.nodes as any,
      edges: workflow.edges as any,
    });

    return execution.id;
  }

  /**
   * Validate workflow DAG
   */
  private validateWorkflow(workflow: any): void {
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];

    if (nodes.length === 0) {
      throw new BadRequestException('Workflow must have at least one node');
    }

    // Check for cycles
    const hasCycle = this.detectCycle(nodes, edges);
    if (hasCycle) {
      throw new BadRequestException('Workflow contains circular dependency');
    }
  }

  /**
   * Detect cycles in DAG using DFS
   */
  private detectCycle(nodes: any[], edges: any[]): boolean {
    const adjacencyList = new Map<string, string[]>();

    // Build adjacency list
    for (const node of nodes) {
      if (!adjacencyList.has(node.id)) {
        adjacencyList.set(node.id, []);
      }
    }

    for (const edge of edges) {
      adjacencyList.get(edge.source)?.push(edge.target);
    }

    // DFS to detect cycle
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (this.hasCycleDFS(node.id, adjacencyList, visited, recursionStack)) {
          return true;
        }
      }
    }

    return false;
  }

  private hasCycleDFS(
    node: string,
    adjacencyList: Map<string, string[]>,
    visited: Set<string>,
    recursionStack: Set<string>,
  ): boolean {
    visited.add(node);
    recursionStack.add(node);

    const neighbors = adjacencyList.get(node) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (this.hasCycleDFS(neighbor, adjacencyList, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  /**
   * Execute workflow nodes in topological order
   */
  async executeWorkflowNodes(
    nodes: any[],
    edges: any[],
    agentExecutor: AgentExecutorService,
  ): Promise<any> {
    const results = new Map<string, any>();

    // Get execution order (topological sort)
    const executionOrder = this.topologicalSort(nodes, edges);

    for (const nodeId of executionOrder) {
      const node = nodes.find((n) => n.id === nodeId);

      if (!node) continue;

      try {
        // Get dependencies
        const dependencies = this.getNodeDependencies(nodeId, edges, results);

        // Execute node
        const result = await this.executeNode(node, dependencies);
        results.set(nodeId, result);
      } catch (error) {
        this.logger.error(`Node execution failed: ${nodeId}`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  private topologicalSort(nodes: any[], edges: any[]): string[] {
    const inDegree = new Map<string, number>();
    const adjacencyList = new Map<string, string[]>();

    // Initialize
    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjacencyList.set(node.id, []);
    }

    // Build adjacency list and in-degree
    for (const edge of edges) {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      adjacencyList.get(edge.source)?.push(edge.target);
    }

    // Find nodes with in-degree 0
    const queue: string[] = [];
    for (const node of nodes) {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
      }
    }

    const result: string[] = [];

    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      for (const neighbor of adjacencyList.get(node) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  /**
   * Get node dependencies from results
   */
  private getNodeDependencies(
    nodeId: string,
    edges: any[],
    results: Map<string, any>,
  ): Record<string, any> {
    const dependencies: Record<string, any> = {};

    for (const edge of edges) {
      if (edge.target === nodeId && results.has(edge.source)) {
        dependencies[edge.source] = results.get(edge.source);
      }
    }

    return dependencies;
  }

  /**
   * Execute individual node
   */
  private async executeNode(node: any, dependencies: Record<string, any>): Promise<any> {
    // Implementation depends on node type
    return {
      nodeId: node.id,
      status: 'completed',
      result: dependencies,
    };
  }
}
