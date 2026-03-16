import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'loyalty_programs' })
export class LoyaltyProgram extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, name: 'points_per_currency', default: 1 })
  pointsPerCurrency: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, name: 'currency_per_point', default: 0.1 })
  currencyPerPoint: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'min_redeem_points', default: 100 })
  minRedeemPoints: number;

  @Column({ type: 'int', name: 'expiry_days', nullable: true })
  expiryDays: number | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
