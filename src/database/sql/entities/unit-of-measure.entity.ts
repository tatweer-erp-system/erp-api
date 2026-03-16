import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { UomCategory, UomType } from '@/common/enums/inventory.enums';

@Entity({ name: 'units_of_measure' })
export class UnitOfMeasure extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' }) nameEn: string;
  @Column({ type: 'varchar', length: 255, name: 'name_ar' }) nameAr: string;
  @Column({ type: 'enum', enum: UomCategory, name: 'uom_category' }) uomCategory: UomCategory;
  @Column({ type: 'enum', enum: UomType, name: 'uom_type', default: UomType.REFERENCE })
  uomType: UomType;
  @Column({ type: 'decimal', precision: 12, scale: 6, default: 1 }) ratio: number;
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
}
