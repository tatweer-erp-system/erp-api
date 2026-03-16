import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity('account_groups')
export class AccountGroup extends BaseEntity {
  @Column({ type: 'varchar', length: 50, name: 'code_prefix', nullable: false })
  codePrefix: string;

  @Column({ type: 'varchar', length: 255, name: 'name_en', nullable: false })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar', nullable: false })
  nameAr: string;
}
