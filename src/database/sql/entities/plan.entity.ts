import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'plans' })
export class Plan extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'text', name: 'description_en', nullable: true })
  descriptionEn: string | null;

  @Column({ type: 'text', name: 'description_ar', nullable: true })
  descriptionAr: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'monthly_price', default: 0 })
  monthlyPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'annual_price', default: 0 })
  annualPrice: number;

  @Column({ type: 'varchar', length: 10, default: 'SAR' })
  currency: string;

  @Column({ type: 'simple-array', nullable: true })
  modules: string[];

  @Column({ type: 'int', name: 'max_users', nullable: true })
  maxUsers: number | null;

  @Column({ type: 'jsonb', nullable: true })
  features: Record<string, boolean | string | number> | null;

  @Column({ type: 'int', name: 'trial_days', default: 14 })
  trialDays: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;
}
