import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '@/modules/auth/entities/user.entity';

export enum PlanType {
  FREE = 'FREE',
  PRO = 'PRO',
  TEAM = 'TEAM',
  ENTERPRISE = 'ENTERPRISE',
}

export enum BillingPeriod {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  PAST_DUE = 'PAST_DUE',
  EXPIRED = 'EXPIRED',
  PAUSED = 'PAUSED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PlanType })
  type: PlanType;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  monthlyPrice: number; // in cents

  @Column()
  yearlyPrice: number; // in cents

  @Column({ type: 'jsonb' })
  features: {
    chatTokensPerMonth: number;
    agentExecutionsPerMonth: number;
    appsPerMonth: number;
    deploymentsPerMonth: number;
    analyticsRetentionDays: number;
    customDomain: boolean;
    priority: boolean;
    apiAccess: boolean;
  };

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Plan, { eager: true })
  plan: Plan;

  @Column()
  planId: string;

  @Column({ type: 'enum', enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @Column({ type: 'enum', enum: BillingPeriod })
  billingPeriod: BillingPeriod;

  @Column()
  currentPeriodStart: Date;

  @Column()
  currentPeriodEnd: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true })
  stripeSubscriptionId: string;

  @Column({ nullable: true })
  stripeCustomerId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Subscription, { nullable: true, eager: true })
  subscription: Subscription;

  @Column({ nullable: true })
  subscriptionId: string;

  @Column()
  amount: number; // in cents

  @Column()
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus })
  status: PaymentStatus;

  @Column({ nullable: true })
  stripePaymentIntentId: string;

  @Column({ nullable: true })
  stripeChargeId: string;

  @Column({ nullable: true })
  failureReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Subscription, { nullable: true, eager: true })
  subscription: Subscription;

  @Column({ nullable: true })
  subscriptionId: string;

  @Column()
  invoiceNumber: string;

  @Column()
  amount: number; // in cents

  @Column()
  currency: string;

  @Column({ nullable: true })
  taxAmount: number;

  @Column()
  periodStart: Date;

  @Column()
  periodEnd: Date;

  @Column()
  dueDate: Date;

  @Column({ type: 'enum', enum: PaymentStatus })
  status: PaymentStatus;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ nullable: true })
  stripeInvoiceId: string;

  @Column({ type: 'jsonb' })
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('credit_wallets')
export class CreditWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column('decimal', { precision: 12, scale: 2 })
  balance: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalEarned: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalSpent: number;

  @OneToMany(() => CreditTransaction, (tx) => tx.wallet, { cascade: true })
  transactions: CreditTransaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('credit_transactions')
export class CreditTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CreditWallet, (wallet) => wallet.transactions, { onDelete: 'CASCADE' })
  wallet: CreditWallet;

  @Column()
  walletId: string;

  @Column()
  amount: number;

  @Column()
  type: 'DEBIT' | 'CREDIT' | 'REFUND';

  @Column()
  reason: string;

  @Column({ nullable: true })
  referenceId: string; // Chat, Agent, App, etc.

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column('decimal', { precision: 12, scale: 2 })
  balanceAfter: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('usage_records')
export class UsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column()
  userId: string;

  @Column()
  resourceType: string; // CHAT_TOKENS, AGENT_EXECUTION, APP_GENERATION, etc.

  @Column()
  resourceId: string;

  @Column('decimal', { precision: 12, scale: 2 })
  quantity: number;

  @Column('decimal', { precision: 12, scale: 2 })
  costPerUnit: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalCost: number;

  @Column()
  billingMonth: Date;

  @Column({ default: false })
  invoiced: boolean;

  @Column({ nullable: true })
  invoiceId: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('billing_cycles')
export class BillingCycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column()
  userId: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column('decimal', { precision: 12, scale: 2 })
  totalUsageCost: number;

  @Column('decimal', { precision: 12, scale: 2 })
  subscriptionCost: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalCost: number;

  @Column({ default: false })
  invoiceGenerated: boolean;

  @Column({ nullable: true })
  invoiceId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
