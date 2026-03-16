import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { VoucherType, VoucherStatus } from '@/common/enums/loyalty.enums';

@Entity({ name: 'vouchers' })
export class Voucher extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'enum', enum: VoucherType, name: 'voucher_type' })
  voucherType: VoucherType;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  value: number | null;

  @Column({ type: 'uuid', name: 'product_id', nullable: true })
  productId: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'min_order_amount', default: 0 })
  minOrderAmount: number;

  @Column({ type: 'int', name: 'usage_limit', nullable: true })
  usageLimit: number | null;

  @Column({ type: 'int', name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ type: 'uuid', name: 'customer_id', nullable: true })
  customerId: string | null;

  @Column({ type: 'date', name: 'valid_from', nullable: true })
  validFrom: Date | null;

  @Column({ type: 'date', name: 'valid_until', nullable: true })
  validUntil: Date | null;

  @Column({ type: 'enum', enum: VoucherStatus, default: VoucherStatus.ACTIVE })
  status: VoucherStatus;
}
