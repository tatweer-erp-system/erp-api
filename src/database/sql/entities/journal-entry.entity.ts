import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { JournalEntryType } from '@/common/enums/accounting.enums';

@Table({
  tableName: 'journal_entries',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class JournalEntry extends TenantAwareEntity<JournalEntry> {
  @Column({ type: DataType.STRING(50), allowNull: false })
  entryNumber!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'date' })
  entryDate!: string;

  @Column({
    type: DataType.STRING(30),
    allowNull: false,
    defaultValue: JournalEntryType.MANUAL,
    field: 'type',
  })
  entryType!: JournalEntryType;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  referenceId!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  referenceType!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  reversedBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  reversalOf!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isPosted!: boolean;

  @Column({ type: DataType.UUID, allowNull: true })
  postedBy!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  postedAt!: Date | null;

  @Column({ type: DataType.BIGINT, allowNull: true })
  periodId!: number | null;
}
