import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { TaxType, TaxScope } from '@/common/enums/inventory.enums';

@Entity({ name: 'taxes' })
export class Tax extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' }) nameEn: string;
  @Column({ type: 'varchar', length: 255, name: 'name_ar' }) nameAr: string;
  @Column({ type: 'enum', enum: TaxType, name: 'tax_type', default: TaxType.PERCENTAGE })
  taxType: TaxType;
  @Column({ type: 'enum', enum: TaxScope, default: TaxScope.BOTH }) scope: TaxScope;
  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 }) amount: number;
  @Column({ type: 'boolean', name: 'include_in_price', default: false }) includeInPrice: boolean;
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
}
