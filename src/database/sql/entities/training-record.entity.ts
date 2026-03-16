import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'training_records' })
export class TrainingRecord extends BaseEntity {
  @Column({ type: 'uuid', name: 'employee_id' })
  employeeId: string;

  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'varchar', length: 255, name: 'training_name' })
  trainingName: string;

  @Column({ type: 'varchar', length: 255, name: 'provider', nullable: true })
  provider: string | null;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: number | null;

  @Column({ type: 'varchar', length: 255, name: 'certificate_url', nullable: true })
  certificateUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
