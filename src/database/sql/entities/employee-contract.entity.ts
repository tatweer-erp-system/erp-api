import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { ContractType, ContractStatus } from '@/common/enums/hr.enums';

@Table({
  tableName: 'employee_contracts',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class EmployeeContract extends TenantAwareEntity<EmployeeContract> {
  @Column({ type: DataType.UUID, allowNull: false })
  employeeId!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: ContractType.FULL_TIME,
  })
  contractType!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  startDate!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  endDate!: string | null;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 })
  basicSalary!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 })
  housingAllowance!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 })
  transportationAllowance!: number;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: ContractStatus.DRAFT,
  })
  status!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;
}
