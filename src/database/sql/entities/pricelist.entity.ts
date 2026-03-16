import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { PricelistDiscountPolicy } from '@/common/enums/inventory.enums';

@Entity({ name: 'pricelists' })
export class Pricelist extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' }) nameEn: string;
  @Column({ type: 'varchar', length: 255, name: 'name_ar' }) nameAr: string;
  @Column({ type: 'uuid', name: 'currency_id', nullable: true }) currencyId: string | null;
  @Column({
    type: 'enum',
    enum: PricelistDiscountPolicy,
    name: 'discount_policy',
    default: PricelistDiscountPolicy.DISCOUNT_ON_SALE,
  })
  discountPolicy: PricelistDiscountPolicy;
  @Column({ type: 'date', name: 'start_date', nullable: true }) startDate: Date | null;
  @Column({ type: 'date', name: 'end_date', nullable: true }) endDate: Date | null;
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
}
