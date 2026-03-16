import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { LocationType } from '@/common/enums/inventory.enums';

@Entity({ name: 'stock_locations' })
export class StockLocation extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'uuid', name: 'parent_id', nullable: true })
  parentId: string | null;

  @Column({ type: 'uuid', name: 'warehouse_id', nullable: true })
  warehouseId: string | null;

  @Column({
    type: 'enum',
    enum: LocationType,
    name: 'location_type',
    default: LocationType.INTERNAL,
  })
  locationType: LocationType;

  @Column({ type: 'boolean', name: 'is_scrap', default: false })
  isScrap: boolean;

  @Column({ type: 'boolean', name: 'is_return', default: false })
  isReturn: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
