import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity('currencies')
export class Currency extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 10, nullable: false })
  code: string;

  @Column({ type: 'varchar', length: 255, name: 'name_en', nullable: false })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar', nullable: false })
  nameAr: string;

  @Column({ type: 'varchar', length: 10, nullable: false })
  symbol: string;

  @Column({ type: 'boolean', name: 'is_base', default: false })
  isBase: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
