import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { TableStatus } from '@/common/enums/restaurant.enums';

@Entity({ name: 'restaurant_tables' })
export class RestaurantTable extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'uuid', name: 'section_id' })
  sectionId: string;

  @Column({ type: 'varchar', length: 50 })
  number: string;

  @Column({ type: 'int', default: 2 })
  capacity: number;

  @Column({ type: 'enum', enum: TableStatus, default: TableStatus.AVAILABLE })
  status: TableStatus;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
