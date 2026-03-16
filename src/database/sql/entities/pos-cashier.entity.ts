import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'pos_cashiers' })
export class PosCashier extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255, name: 'pin_hash' })
  pinHash: string;

  @Column({ type: 'varchar', length: 255, name: 'display_name' })
  displayName: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'max_discount_pct', default: 10 })
  maxDiscountPct: number;

  @Column({ type: 'boolean', name: 'can_refund', default: false })
  canRefund: boolean;

  @Column({ type: 'boolean', name: 'can_void', default: false })
  canVoid: boolean;

  @Column({ type: 'boolean', name: 'can_open_drawer', default: true })
  canOpenDrawer: boolean;

  @Column({ type: 'int', name: 'failed_pin_attempts', default: 0 })
  failedPinAttempts: number;

  @Column({ type: 'timestamptz', name: 'locked_until', nullable: true })
  lockedUntil: Date | null;

  get(opts?: { plain: boolean }): PosCashier {
    return this;
  }
}
