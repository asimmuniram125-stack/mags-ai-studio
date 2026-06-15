import { IsString, IsEmail, IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { OrganizationType, OrganizationRole } from '../entities/organization.entity';

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsEnum(OrganizationType)
  type: OrganizationType;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsObject()
  settings?: {
    inviteRequired?: boolean;
    twoFactorRequired?: boolean;
    allowPublicSharing?: boolean;
  };
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsObject()
  settings?: any;
}

export class CreateMembershipDto {
  @IsEmail()
  email: string;

  @IsEnum(OrganizationRole)
  role: OrganizationRole;
}

export class UpdateMembershipDto {
  @IsEnum(OrganizationRole)
  role: OrganizationRole;

  @IsOptional()
  @IsObject()
  customPermissions?: Record<string, boolean>;
}

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsEnum(OrganizationRole)
  role: OrganizationRole;

  @IsOptional()
  @IsString()
  message?: string;
}

export class AcceptInvitationDto {
  @IsString()
  token: string;
}

export class CreateWorkspaceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  settings?: any;
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  settings?: any;
}

export class ShareResourceDto {
  @IsString()
  resourceType: string;

  @IsString()
  resourceId: string;

  @IsObject()
  permissions: {
    view: boolean;
    edit: boolean;
    delete: boolean;
    share: boolean;
    admin: boolean;
  };

  @IsOptional()
  @IsString()
  workspaceId?: string;
}

export class OrganizationResponseDto {
  id: string;
  name: string;
  description?: string;
  owner: any;
  type: OrganizationType;
  memberCount: number;
  workspaceCount: number;
  createdAt: Date;
}

export class MembershipResponseDto {
  id: string;
  user: any;
  role: OrganizationRole;
  joinedAt: Date;
  active: boolean;
}

export class WorkspaceResponseDto {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  creator: any;
  projectCount: number;
  createdAt: Date;
}
