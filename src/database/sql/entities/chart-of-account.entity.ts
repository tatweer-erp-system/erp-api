import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { AccountType, NormalBalance } from '@/common/enums/accounting.enums';

@Entity('chart_of_accounts')
export class ChartOfAccount extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, nullable: false })
  code: string;

  @Column({ type: 'varchar', length: 255, name: 'name_en', nullable: false })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar', nullable: false })
  nameAr: string;

  @Column({ type: 'enum', enum: AccountType, name: 'account_type', nullable: false })
  accountType: AccountType;

  @Column({ type: 'enum', enum: NormalBalance, name: 'normal_balance', nullable: false })
  normalBalance: NormalBalance;

  @Column({ type: 'uuid', name: 'group_id', nullable: true })
  groupId: string | null;

  @Column({ type: 'uuid', name: 'currency_id', nullable: true })
  currencyId: string | null;

  @Column({ type: 'boolean', name: 'is_reconcilable', default: false })
  isReconcilable: boolean;

  @Column({ type: 'boolean', name: 'is_deprecated', default: false })
  isDeprecated: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
