import {
  Column,
  DataType,
  Table,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
} from 'sequelize-typescript';
import { Model } from 'sequelize-typescript';

@Table({
  tableName: 'journal_lines',
  timestamps: false,
  paranoid: false,
  schema: 'public',
})
export class JournalLine extends Model<JournalLine> {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.BIGINT })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false, field: 'entryId' })
  journalEntryId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  accountId!: string;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  debit!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  credit!: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  costCenterId!: string | null;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: 'SAR', field: 'currency' })
  currencyCode!: string;

  @Column({ type: DataType.DECIMAL(15, 6), allowNull: true, defaultValue: 1 })
  exchangeRate!: number | null;

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date;
}
