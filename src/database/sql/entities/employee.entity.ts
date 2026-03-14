import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'employees',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Employee extends TenantAwareEntity<Employee> {
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  userId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  departmentId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  branchId!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: false })
  positionEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  positionAr!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: 'full-time',
  })
  employmentType!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  hireDate!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  terminationDate!: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  basicSalary!: number | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  housingAllowance!: number | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  transportationAllowance!: number | null;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
    defaultValue: 'SAR',
  })
  salaryCurrency!: string;

  @Column({ type: DataType.STRING(50), allowNull: true })
  employeeNumber!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  managerId!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  nationality!: string | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isSaudi!: boolean;
}
