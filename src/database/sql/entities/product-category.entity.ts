import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'product_categories' })
export class ProductCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' }) nameEn: string;
  @Column({ type: 'varchar', length: 255, name: 'name_ar' }) nameAr: string;
  @Column({ type: 'uuid', name: 'parent_id', nullable: true }) parentId: string | null;
  @Column({ type: 'uuid', name: 'income_account_id', nullable: true }) incomeAccountId:
    | string
    | null;
  @Column({ type: 'uuid', name: 'cogs_account_id', nullable: true }) cogsAccountId: string | null;
  @Column({ type: 'uuid', name: 'inventory_account_id', nullable: true }) inventoryAccountId:
    | string
    | null;
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
}
