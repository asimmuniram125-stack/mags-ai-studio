import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePresenceDto {
  @IsEnum(['ONLINE', 'AWAY', 'OFFLINE', 'TYPING'])
  status: 'ONLINE' | 'AWAY' | 'OFFLINE' | 'TYPING';

  @IsOptional()
  @IsString()
  currentResource?: string;
}

export class PresenceResponseDto {
  userId: string;
  user: any;
  status: 'ONLINE' | 'AWAY' | 'OFFLINE' | 'TYPING';
  currentResource?: string;
  lastActivityAt: Date;
}
