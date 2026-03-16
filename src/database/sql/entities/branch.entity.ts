import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'branches' })
export class Branch extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' }) nameEn: string;
  @Column({ type: 'varchar', length: 255, name: 'name_ar' }) nameAr: string;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string;
  @Column({ type: 'text', nullable: true }) address: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) phone: string | null;
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
}
