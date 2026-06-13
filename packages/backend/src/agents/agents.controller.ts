import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('agents')
@UseGuards(JwtGuard)
export class AgentsController {
  constructor(private agentsService: AgentsService) {}

  /**
   * Create new agent
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createAgent(
    @CurrentUser() user: any,
    @Body() createAgentDto: CreateAgentDto,
  ) {
    return await this.agentsService.createAgent(user.sub, createAgentDto);
  }

  /**
   * Get all user agents
   */
  @Get()
  async getUserAgents(@CurrentUser() user: any) {
    return await this.agentsService.getUserAgents(user.sub);
  }

  /**
   * Get agent details
   */
  @Get(':id')
  async getAgent(@Param('id') agentId: string, @CurrentUser() user: any) {
    return await this.agentsService.getAgentById(agentId, user.sub);
  }

  /**
   * Delete agent
   */
  @Delete(':id')
  async deleteAgent(@Param('id') agentId: string, @CurrentUser() user: any) {
    await this.agentsService.deleteAgent(agentId, user.sub);
    return { message: 'Agent deleted' };
  }

  /**
   * Create task for agent
   */
  @Post(':id/task')
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @Param('id') agentId: string,
    @CurrentUser() user: any,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    const taskId = await this.agentsService.createTask(
      user.sub,
      agentId,
      createTaskDto.title,
      createTaskDto.goal,
      createTaskDto.input,
      createTaskDto.context,
    );
    return { taskId };
  }

  /**
   * Get task details
   */
  @Get(':agentId/tasks/:taskId')
  async getTask(
    @Param('agentId') agentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
  ) {
    return await this.agentsService.getTask(taskId, user.sub);
  }
}
