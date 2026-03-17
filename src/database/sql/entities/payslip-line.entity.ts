import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'payslip_lines',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class PayslipLine extends TenantAwareEntity<PayslipLine> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  payslipId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  ruleId!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: false })
  code!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  category!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sequence!: number;

  @Column({ type: DataType.DECIMAL(18, 4), allowNull: false, defaultValue: 1 })
  quantity!: number;

  @Column({ type: DataType.DECIMAL(18, 6), allowNull: false, defaultValue: 1 })
  rate!: number;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false, defaultValue: 0 })
  amount!: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  appearsOnPayslip!: boolean;
}
