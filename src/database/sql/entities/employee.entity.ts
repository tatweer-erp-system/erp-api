import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { EmploymentType } from '@/common/enums/hr.enums';

@Table({
  tableName: 'employees',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Employee extends TenantAwareEntity<Employee> {
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  userId!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(50), allowNull: true, unique: true })
  employeeCode!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  employeeNumber!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  departmentId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  jobPositionId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  branchId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  managerId!: string | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: EmploymentType.FULL_TIME,
  })
  employmentType!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  hireDate!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  terminationDate!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  nationalId!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  birthDate!: string | null;

  @Column({ type: DataType.STRING(10), allowNull: true })
  gender!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  maritalStatus!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  nationality!: string | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isSaudi!: boolean;

  @Column({ type: DataType.STRING(255), allowNull: true })
  emergencyContact!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  emergencyPhone!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  bankAccount!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  bankName!: string | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive!: boolean;
}
