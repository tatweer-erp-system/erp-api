import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity('cost_centers')
export class CostCenter extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en', nullable: false })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar', nullable: false })
  nameAr: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  code: string;

  @Column({ type: 'uuid', name: 'parent_id', nullable: true })
  parentId: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
