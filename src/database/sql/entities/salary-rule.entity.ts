import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import {
  SalaryRuleCategory,
  SalaryRuleConditionType,
  SalaryRuleComputationType,
} from '@/common/enums/hr-new.enums';

@Table({
  tableName: 'salary_rules',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class SalaryRule extends TenantAwareEntity<SalaryRule> {
  @Column({ type: DataType.UUID, allowNull: false })
  structureId!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sequence!: number;

  @Column({ type: DataType.STRING(20), allowNull: false })
  code!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: SalaryRuleCategory.BASIC,
  })
  category!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: SalaryRuleConditionType.ALWAYS,
  })
  conditionType!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  conditionPython!: string | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: SalaryRuleComputationType.FIXED,
  })
  computationType!: string;

  @Column({ type: DataType.DECIMAL(18, 4), allowNull: true })
  amount!: number | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  percentBase!: string | null;

  @Column({ type: DataType.DECIMAL(8, 4), allowNull: true })
  percentValue!: number | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  codePython!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  appearsOnPayslip!: boolean;
}
