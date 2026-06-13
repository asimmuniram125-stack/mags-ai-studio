import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('tasks')
@UseGuards(JwtGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  /**
   * Get task
   */
  @Get(':id')
  async getTask(@Param('id') taskId: string, @CurrentUser() user: any) {
    return await this.tasksService.getTaskById(taskId, user.sub);
  }

  /**
   * Get agent tasks
   */
  @Get('agent/:agentId/tasks')
  async getAgentTasks(
    @Param('agentId') agentId: string,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '10',
    @CurrentUser() user: any,
  ) {
    return await this.tasksService.getAgentTasks(
      agentId,
      user.sub,
      parseInt(skip),
      parseInt(take),
    );
  }

  /**
   * Cancel task
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelTask(@Param('id') taskId: string, @CurrentUser() user: any) {
    await this.tasksService.cancelTask(taskId, user.sub);
    return { message: 'Task cancelled' };
  }

  /**
   * Retry task
   */
  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  async retryTask(@Param('id') taskId: string, @CurrentUser() user: any) {
    const taskId = await this.tasksService.retryTask(taskId, user.sub);
    return { taskId };
  }
}
