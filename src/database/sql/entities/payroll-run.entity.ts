import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { PayrollStatus } from '@/common/enums/hr.enums';

@Table({
  tableName: 'payroll_runs',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class PayrollRun extends TenantAwareEntity<PayrollRun> {
  @Column({ type: DataType.DATEONLY, allowNull: false })
  periodStart!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  periodEnd!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: PayrollStatus.DRAFT,
  })
  status!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  totalEmployees!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 })
  totalGross!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 })
  totalDeductions!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 })
  totalNet!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 })
  totalGosiEmployer!: number;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: 'SAR' })
  currency!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  processedBy!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  processedAt!: Date | null;

  @Column({ type: DataType.UUID, allowNull: true })
  approvedBy!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  approvedAt!: Date | null;

  @Column({ type: DataType.UUID, allowNull: true })
  journalEntryId!: string | null;
}
