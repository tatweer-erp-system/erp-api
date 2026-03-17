import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { ActivityType } from '@/common/enums/activity.enums';

@Table({
  tableName: 'activities',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Activity extends TenantAwareEntity<Activity> {
  @Column({ type: DataType.STRING(50), allowNull: false })
  model!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  recordId!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  recordName!: string | null;

  @Column({ type: DataType.STRING(30), allowNull: false })
  activityType!: ActivityType;

  @Column({ type: DataType.STRING(50), allowNull: true })
  icon!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: false })
  summary!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  note!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  scheduledDate!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  assignedTo!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isDone!: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  doneAt!: Date | null;

  @Column({ type: DataType.UUID, allowNull: true })
  doneByUserId!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  feedbackNote!: string | null;
}
