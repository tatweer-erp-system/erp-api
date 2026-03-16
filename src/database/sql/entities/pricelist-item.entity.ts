import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { PricelistApplyOn, PricelistComputationType } from '@/common/enums/inventory.enums';

@Entity({ name: 'pricelist_items' })
export class PricelistItem extends BaseEntity {
  @Column({ type: 'uuid', name: 'pricelist_id' }) pricelistId: string;
  @Column({
    type: 'enum',
    enum: PricelistApplyOn,
    name: 'apply_on',
    default: PricelistApplyOn.ALL_PRODUCTS,
  })
  applyOn: PricelistApplyOn;
  @Column({ type: 'uuid', name: 'product_id', nullable: true }) productId: string | null;
  @Column({ type: 'uuid', name: 'category_id', nullable: true }) categoryId: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 4, name: 'min_qty', default: 0 }) minQty: number;
  @Column({
    type: 'enum',
    enum: PricelistComputationType,
    name: 'computation_type',
    default: PricelistComputationType.FIXED,
  })
  computationType: PricelistComputationType;
  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true }) price: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 4, name: 'discount_percent', nullable: true })
  discountPercent: number | null;
  @Column({ type: 'date', name: 'start_date', nullable: true }) startDate: Date | null;
  @Column({ type: 'date', name: 'end_date', nullable: true }) endDate: Date | null;
}
