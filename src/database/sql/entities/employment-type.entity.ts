import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'employment_types' })
export class EmploymentType extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
