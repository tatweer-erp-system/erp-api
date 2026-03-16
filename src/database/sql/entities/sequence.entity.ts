import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'sequences' })
@Index(['branchId', 'module'], { unique: true })
export class Sequence extends BaseEntity {
  @Column({ type: 'uuid', name: 'branch_id' }) branchId: string;
  @Column({ type: 'varchar', length: 100 }) module: string;
  @Column({ type: 'varchar', length: 20 }) prefix: string;
  @Column({ type: 'varchar', length: 20, name: 'branch_code' }) branchCode: string;
  @Column({ type: 'int', name: 'next_number', default: 1 }) nextNumber: number;
}
