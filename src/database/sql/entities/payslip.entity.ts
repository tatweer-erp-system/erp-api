import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { PayslipStatus } from '@/common/enums/hr-new.enums';

@Table({
  tableName: 'payslips',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Payslip extends TenantAwareEntity<Payslip> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  employeeId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  contractId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  structureId!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  reference!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  periodStart!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  periodEnd!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: PayslipStatus.DRAFT,
  })
  status!: string;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false, defaultValue: 0 })
  grossSalary!: number;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false, defaultValue: 0 })
  totalDeductions!: number;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false, defaultValue: 0 })
  netSalary!: number;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false, defaultValue: 0 })
  gosiEmployee!: number;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false, defaultValue: 0 })
  gosiEmployer!: number;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false, defaultValue: 0 })
  incomeTax!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  journalEntryId!: string | null;
}
