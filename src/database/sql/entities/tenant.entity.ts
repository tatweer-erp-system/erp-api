import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { TenantStatus } from '@/common/enums/tenant.enums';

@Entity({ name: 'tenants' })
export class Tenant extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  domain: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  timezone: string | null;

  @Column({ type: 'varchar', length: 10, name: 'locale', default: 'en' })
  locale: string;

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.TRIAL })
  status: TenantStatus;

  @Column({ type: 'uuid', name: 'plan_id', nullable: true })
  planId: string | null;

  @Column({ type: 'int', name: 'max_branches', default: 1 })
  maxBranches: number;

  @Column({ type: 'int', name: 'max_users', default: 10 })
  maxUsers: number;

  @Column({ type: 'date', name: 'trial_ends_at', nullable: true })
  trialEndsAt: Date | null;

  @Column({ type: 'jsonb', name: 'settings', nullable: true })
  settings: Record<string, any> | null;

  @Column({ type: 'jsonb', name: 'features', nullable: true })
  features: Record<string, boolean> | null;

  @Column({ type: 'varchar', length: 500, name: 'logo_url', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 100, name: 'tax_number', nullable: true })
  taxNumber: string | null;

  @Column({ type: 'timestamptz', name: 'suspended_at', nullable: true })
  suspendedAt: Date | null;

  @Column({ type: 'text', name: 'suspend_reason', nullable: true })
  suspendReason: string | null;

  @Column({ type: 'timestamptz', name: 'cancelled_at', nullable: true })
  cancelledAt: Date | null;
}
