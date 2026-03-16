import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { TreasuryAccountType } from '@/common/enums/treasury.enums';

@Entity({ name: 'treasury_accounts' })
export class TreasuryAccount extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'enum', enum: TreasuryAccountType, name: 'account_type' })
  accountType: TreasuryAccountType;

  @Column({ type: 'decimal', precision: 20, scale: 4, default: 0 })
  balance: number;

  @Column({ type: 'uuid', name: 'coa_account_id', nullable: true })
  coaAccountId: string | null;

  @Column({ type: 'varchar', length: 100, name: 'bank_name', nullable: true })
  bankName: string | null;

  @Column({ type: 'varchar', length: 100, name: 'bank_account_number', nullable: true })
  bankAccountNumber: string | null;

  @Column({ type: 'varchar', length: 50, name: 'iban', nullable: true })
  iban: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
