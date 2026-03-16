import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { PayslipStatus } from '@/common/enums/payroll.enums';

@Entity({ name: 'payslips' })
export class Payslip extends BaseEntity {
  @Column({ type: 'uuid', name: 'employee_id' })
  employeeId: string;

  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'uuid', name: 'contract_id', nullable: true })
  contractId: string | null;

  @Column({ type: 'uuid', name: 'structure_id', nullable: true })
  structureId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'date', name: 'period_from' })
  periodFrom: Date;

  @Column({ type: 'date', name: 'period_to' })
  periodTo: Date;

  @Column({ type: 'enum', enum: PayslipStatus, default: PayslipStatus.DRAFT })
  status: PayslipStatus;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'basic_wage', default: 0 })
  basicWage: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'gross_wage', default: 0 })
  grossWage: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'total_deductions', default: 0 })
  totalDeductions: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'net_wage', default: 0 })
  netWage: number;

  @Column({ type: 'uuid', name: 'journal_entry_id', nullable: true })
  journalEntryId: string | null;
}
