import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { JournalType } from '@/common/enums/accounting.enums';

@Entity('accounting_journals')
export class AccountingJournal extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en', nullable: false })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar', nullable: false })
  nameAr: string;

  @Column({ type: 'enum', enum: JournalType, name: 'journal_type', nullable: false })
  journalType: JournalType;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, nullable: false })
  code: string;

  @Column({ type: 'uuid', name: 'default_account_id', nullable: true })
  defaultAccountId: string | null;

  @Column({ type: 'uuid', name: 'suspense_account_id', nullable: true })
  suspenseAccountId: string | null;

  @Column({ type: 'uuid', name: 'currency_id', nullable: true })
  currencyId: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
