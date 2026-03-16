import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'public_holidays' })
export class PublicHoliday extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'boolean', name: 'is_recurring', default: false })
  isRecurring: boolean;

  @Index()
  @Column({ type: 'int' })
  year: number;
}
