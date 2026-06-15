export enum OrganizationRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
  BILLING_ADMIN = 'BILLING_ADMIN',
}

export enum OrganizationType {
  PERSONAL = 'PERSONAL',
  TEAM = 'TEAM',
  ENTERPRISE = 'ENTERPRISE',
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  owner: any;
  type: OrganizationType;
  memberCount: number;
  workspaceCount: number;
  active: boolean;
  settings?: {
    defaultRole?: OrganizationRole;
    inviteRequired?: boolean;
    customDomain?: string;
    twoFactorRequired?: boolean;
    allowPublicSharing?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Membership {
  id: string;
  user: any;
  organization: Organization;
  role: OrganizationRole;
  joinedAt: Date;
  active: boolean;
  customPermissions?: Record<string, boolean>;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  creator: any;
  projectCount: number;
  active: boolean;
  settings?: {
    isPublic?: boolean;
    defaultRole?: OrganizationRole;
    allowGuests?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  icon?: string;
  order: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invitation {
  id: string;
  email: string;
  role: OrganizationRole;
  organizationId: string;
  invitedBy: any;
  accepted: boolean;
  acceptedAt?: Date;
  expired: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  action: string;
  resourceType: string;
  resourceName?: string;
  resourceId?: string;
  user: any;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface Presence {
  userId: string;
  user: any;
  status: 'ONLINE' | 'AWAY' | 'OFFLINE' | 'TYPING';
  currentResource?: string;
  lastActivityAt: Date;
}

export interface SharedResource {
  id: string;
  resourceType: string;
  resourceId: string;
  workspaceId: string;
  organizationId: string;
  sharedBy: string;
  permissions: {
    view: boolean;
    edit: boolean;
    delete: boolean;
    share: boolean;
    admin: boolean;
  };
  active: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
