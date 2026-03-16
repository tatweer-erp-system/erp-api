import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'reorder_rules' })
export class ReorderRule extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @Column({ type: 'uuid', name: 'location_id' })
  locationId: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'min_qty', default: 0 })
  minQty: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'max_qty', default: 0 })
  maxQty: number;

  @Column({ type: 'uuid', name: 'preferred_vendor_id', nullable: true })
  preferredVendorId: string | null;

  @Column({ type: 'int', name: 'lead_time_days', default: 0 })
  leadTimeDays: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
