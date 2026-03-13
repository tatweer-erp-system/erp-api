import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { TrainingStatus, TrainingType } from '@/common/enums/hr.enums';

@Table({
  tableName: 'training_records',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class TrainingRecord extends TenantAwareEntity<TrainingRecord> {
  @Column({ type: DataType.UUID, allowNull: false })
  employeeId!: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  courseName!: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  provider!: string | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    defaultValue: TrainingType.INTERNAL,
  })
  trainingType!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  startDate!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  endDate!: string | null;

  @Column({ type: DataType.DECIMAL(6, 2), allowNull: true })
  durationHours!: number | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: TrainingStatus.PLANNED,
  })
  status!: string;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true })
  score!: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  passed!: boolean | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  certificateNumber!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  certificateUrl!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  certificateExpiry!: string | null;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 })
  cost!: number | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;
}
