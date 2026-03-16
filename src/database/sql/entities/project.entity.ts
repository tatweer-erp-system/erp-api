import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { ProjectStatus } from '@/common/enums/project.enums';

@Entity({ name: 'projects', schema: 'public' })
export class Project extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id', nullable: true })
  branchId: string | null;

  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'text', name: 'description_en', nullable: true })
  descriptionEn: string | null;

  @Column({ type: 'text', name: 'description_ar', nullable: true })
  descriptionAr: string | null;

  @Column({ type: 'uuid', name: 'manager_id', nullable: true })
  managerId: string | null;

  @Column({ type: 'uuid', name: 'customer_id', nullable: true })
  customerId: string | null;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.PLANNING })
  status: ProjectStatus;

  @Column({ type: 'date', name: 'start_date', nullable: true })
  startDate: Date | null;

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate: Date | null;

  @Column({ type: 'decimal', precision: 20, scale: 4, nullable: true })
  budget: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress: number;
}
