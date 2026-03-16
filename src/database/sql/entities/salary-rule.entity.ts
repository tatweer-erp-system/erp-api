import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { SalaryRuleCategory, SalaryRuleComputeType } from '@/common/enums/payroll.enums';

@Entity({ name: 'salary_rules' })
export class SalaryRule extends BaseEntity {
  @Column({ type: 'uuid', name: 'structure_id' })
  structureId: string;

  @Column({ type: 'int', default: 10 })
  sequence: number;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'enum', enum: SalaryRuleCategory })
  category: SalaryRuleCategory;

  @Column({
    type: 'enum',
    enum: SalaryRuleComputeType,
    name: 'compute_type',
    default: SalaryRuleComputeType.FIXED,
  })
  computeType: SalaryRuleComputeType;

  @Column({ type: 'decimal', precision: 20, scale: 4, nullable: true })
  amount: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  percentage: number | null;

  @Column({ type: 'text', name: 'code_expression', nullable: true })
  codeExpression: string | null;

  @Column({ type: 'boolean', name: 'appears_on_payslip', default: true })
  appearsOnPayslip: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
