import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { SalaryRuleCategory } from '@/common/enums/payroll.enums';

@Entity({ name: 'payslip_lines' })
export class PayslipLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'payslip_id' })
  payslipId: string;

  @Column({ type: 'int', default: 0 })
  sequence: number;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'enum', enum: SalaryRuleCategory })
  category: SalaryRuleCategory;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, default: 0 })
  rate: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, default: 0 })
  amount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
