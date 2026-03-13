import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

@Table({
  tableName: 'payroll_items',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class PayrollItem extends BaseEntity<PayrollItem> {
  @Column({ type: DataType.UUID, allowNull: false })
  runId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  employeeId!: string;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 })
  basicSalary!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 })
  housingAllowance!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 })
  transportationAllowance!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 })
  otherAllowances!: number;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: [] })
  allowancesDetail!: Record<string, unknown>[];

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 })
  grossSalary!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 })
  lateDeductions!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 })
  absenceDeductions!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 })
  loanDeductions!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 })
  gosiEmployee!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 })
  otherDeductions!: number;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: [] })
  deductionsDetail!: Record<string, unknown>[];

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 })
  totalDeductions!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 })
  netPay!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 })
  gosiEmployer!: number;

  @Column({ type: DataType.STRING(20), allowNull: true, defaultValue: 'pending' })
  paymentStatus!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  paymentDate!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  paymentReference!: string | null;
}
