import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'loyalty_tiers' })
export class LoyaltyTier extends BaseEntity {
  @Column({ type: 'uuid', name: 'program_id' })
  programId: string;

  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'min_points' })
  minPoints: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, name: 'bonus_multiplier', default: 1 })
  bonusMultiplier: number;

  @Column({ type: 'int', default: 0 })
  sequence: number;
}
