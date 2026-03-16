import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'roles' })
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' }) nameEn: string;
  @Column({ type: 'varchar', length: 255, name: 'name_ar' }) nameAr: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'boolean', name: 'is_system', default: false }) isSystem: boolean;
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
}
