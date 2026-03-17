import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { JournalType } from '@/common/enums/accounting-new.enums';

@Table({
  tableName: 'journals',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Journal extends TenantAwareEntity<Journal> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  type!: JournalType;

  @Column({ type: DataType.STRING(10), allowNull: false })
  code!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  defaultAccountId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  suspenseAccountId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  sequencePrefix!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
