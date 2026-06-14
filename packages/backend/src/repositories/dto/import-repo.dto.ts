import { IsString, IsUrl, IsOptional } from 'class-validator';

export class ImportRepoDto {
  @IsUrl()
  url: string; // GitHub repository URL

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
