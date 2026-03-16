import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { ActivityType } from '@/common/enums/crm.enums';

@Entity({ name: 'activities' })
export class Activity extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 100, name: 'record_model' })
  recordModel: string;

  @Index()
  @Column({ type: 'uuid', name: 'record_id' })
  recordId: string;

  @Column({ type: 'enum', enum: ActivityType, name: 'activity_type' })
  activityType: ActivityType;

  @Column({ type: 'varchar', length: 500 })
  summary: string;

  @Column({ type: 'date', name: 'due_date' })
  dueDate: Date;

  @Column({ type: 'uuid', name: 'assigned_to', nullable: true })
  assignedTo: string | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'uuid', name: 'completed_by_id', nullable: true })
  completedById: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}
