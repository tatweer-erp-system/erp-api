import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, UpdatedAt, DeletedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'employees', timestamps: true, paranoid: true, underscored: true })
export class Employee extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false, unique: true, field: 'user_id' })
  userId!: string;

  @Column({ type: DataType.UUID, allowNull: true, field: 'department_id' })
  departmentId!: string | null;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } })
  position!: { en: string; ar: string };

  @Column({ type: DataType.STRING(50), allowNull: false, field: 'employment_type', defaultValue: 'full-time' })
  employmentType!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'hire_date' })
  hireDate!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'termination_date' })
  terminationDate!: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true, field: 'basic_salary' })
  basicSalary!: number | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true, field: 'housing_allowance' })
  housingAllowance!: number | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true, field: 'transportation_allowance' })
  transportationAllowance!: number | null;

  @Column({ type: DataType.STRING(10), allowNull: true, field: 'salary_currency', defaultValue: 'SAR' })
  salaryCurrency!: string;

  @Column({ type: DataType.STRING(50), allowNull: true, field: 'employee_number' })
  employeeNumber!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'manager_id' })
  managerId!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  nationality!: string | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_saudi' })
  isSaudi!: boolean;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' })
  updatedBy!: string | null;

  @Default(0) @Column(DataType.INTEGER) version!: number;
  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
  @DeletedAt @Column(DataType.DATE) deletedAt!: Date | null;
}
