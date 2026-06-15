import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { User } from '@/modules/auth/entities/user.entity';
import { Subscription } from '@/modules/billing/entities/billing.entity';

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

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  website: string;

  @ManyToOne(() => User, { eager: true })
  owner: User;

  @Column()
  ownerId: string;

  @Column({ type: 'enum', enum: OrganizationType })
  type: OrganizationType;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  country: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    defaultRole?: OrganizationRole;
    inviteRequired?: boolean;
    customDomain?: string;
    twoFactorRequired?: boolean;
    allowPublicSharing?: boolean;
  };

  @OneToMany(() => Membership, (membership) => membership.organization, { cascade: true })
  members: Membership[];

  @OneToMany(() => Workspace, (workspace) => workspace.organization, { cascade: true })
  workspaces: Workspace[];

  @OneToMany(() => Invitation, (invitation) => invitation.organization, { cascade: true })
  invitations: Invitation[];

  @OneToMany(() => ActivityLog, (log) => log.organization, { cascade: true })
  activityLogs: ActivityLog[];

  @Subscription()
  subscription: Subscription;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('memberships')
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, (org) => org.members, { onDelete: 'CASCADE' })
  organization: Organization;

  @Column()
  organizationId: string;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE', eager: true })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: OrganizationRole })
  role: OrganizationRole;

  @Column({ nullable: true })
  joinedAt: Date;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  invitedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  customPermissions: Record<string, boolean>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @@unique([organizationId, userId])
  @@index([organizationId])
  @@index([userId])
}

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Organization, (org) => org.workspaces, { onDelete: 'CASCADE', eager: true })
  organization: Organization;

  @Column()
  organizationId: string;

  @ManyToOne(() => User, { eager: true })
  creator: User;

  @Column()
  creatorId: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    isPublic?: boolean;
    defaultRole?: OrganizationRole;
    allowGuests?: boolean;
  };

  @OneToMany(() => WorkspaceProject, (project) => project.workspace, { cascade: true })
  projects: WorkspaceProject[];

  @OneToMany(() => SharedResource, (resource) => resource.workspace, { cascade: true })
  sharedResources: SharedResource[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @@index([organizationId])
  @@index([creatorId])
}

@Entity('workspace_projects')
export class WorkspaceProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.projects, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Column()
  workspaceId: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ default: 0 })
  order: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @@index([workspaceId])
}

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @ManyToOne(() => Organization, (org) => org.invitations, { onDelete: 'CASCADE', eager: true })
  organization: Organization;

  @Column()
  organizationId: string;

  @ManyToOne(() => User, { eager: true })
  invitedBy: User;

  @Column()
  invitedById: string;

  @Column({ type: 'enum', enum: OrganizationRole })
  role: OrganizationRole;

  @Column()
  token: string;

  @Column({ default: false })
  accepted: boolean;

  @Column({ nullable: true })
  acceptedAt: Date;

  @Column({ default: false })
  expired: boolean;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  acceptedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @@index([email])
  @@index([organizationId])
  @@index([token])
}

@Entity('shared_resources')
export class SharedResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resourceType: string; // CHAT, AGENT, APP, ANALYTICS, REPO

  @Column()
  resourceId: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.sharedResources, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Column()
  workspaceId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  organization: Organization;

  @Column()
  organizationId: string;

  @Column()
  sharedBy: string;

  @Column({ type: 'jsonb' })
  permissions: {
    view: boolean;
    edit: boolean;
    delete: boolean;
    share: boolean;
    admin: boolean;
  };

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @@unique([resourceType, resourceId, workspaceId])
  @@index([workspaceId])
  @@index([organizationId])
  @@index([resourceType])
}

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, (org) => org.activityLogs, { onDelete: 'CASCADE' })
  organization: Organization;

  @Column()
  organizationId: string;

  @Column({ nullable: true })
  workspaceId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'SET NULL' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column()
  action: string; // CREATED, UPDATED, DELETED, SHARED, ACCESSED, etc.

  @Column()
  resourceType: string; // CHAT, AGENT, APP, MEMBER, etc.

  @Column({ nullable: true })
  resourceId: string;

  @Column({ nullable: true })
  resourceName: string;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  timestamp: Date;

  @@index([organizationId])
  @@index([workspaceId])
  @@index([userId])
  @@index([action])
  @@index([timestamp])
}

@Entity('presences')
export class Presence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  organization: Organization;

  @Column()
  organizationId: string;

  @Column({ nullable: true })
  workspaceId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column()
  status: 'ONLINE' | 'AWAY' | 'OFFLINE' | 'TYPING';

  @Column({ nullable: true })
  currentResource: string; // Resource they're currently viewing

  @Column({ nullable: true })
  lastActivityAt: Date;

  @Column({ nullable: true })
  sessionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @@unique([userId, organizationId, sessionId])
  @@index([organizationId])
  @@index([userId])
  @@index([status])
}
