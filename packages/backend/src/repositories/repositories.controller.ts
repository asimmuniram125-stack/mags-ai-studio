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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RepositoriesService } from './repositories.service';
import { ImportRepoDto } from './dto/import-repo.dto';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('repos')
@UseGuards(JwtGuard)
export class RepositoriesController {
  constructor(private repositoriesService: RepositoriesService) {}

  /**
   * Import from GitHub
   */
  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  async importRepository(
    @CurrentUser() user: any,
    @Body() importDto: ImportRepoDto,
  ) {
    return await this.repositoriesService.importRepository(user.sub, importDto);
  }

  /**
   * Upload local repository
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async uploadRepository(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('No file provided');
    }
    return await this.repositoriesService.uploadRepository(user.sub, file);
  }

  /**
   * Get all user repositories
   */
  @Get()
  async getUserRepositories(@CurrentUser() user: any) {
    return await this.repositoriesService.getUserRepositories(user.sub);
  }

  /**
   * Get repository
   */
  @Get(':id')
  async getRepository(@Param('id') repoId: string, @CurrentUser() user: any) {
    return await this.repositoriesService.getRepository(repoId, user.sub);
  }

  /**
   * Get repository structure
   */
  @Get(':id/structure')
  async getRepositoryStructure(@Param('id') repoId: string, @CurrentUser() user: any) {
    return await this.repositoriesService.getRepositoryStructure(repoId, user.sub);
  }

  /**
   * Get file content
   */
  @Get(':id/files/:fileId')
  async getFileContent(
    @Param('id') repoId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    return await this.repositoriesService.getFileContent(repoId, fileId, user.sub);
  }

  /**
   * Delete repository
   */
  @Delete(':id')
  async deleteRepository(@Param('id') repoId: string, @CurrentUser() user: any) {
    return await this.repositoriesService.deleteRepository(repoId, user.sub);
  }
}
