import { Column, DataType, Table } from 'sequelize-typescript';
import { Model, CreatedAt, UpdatedAt, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { FiscalPeriodStatus, FiscalPeriodType } from '@/common/enums/accounting.enums';

@Table({
  tableName: 'fiscal_periods',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class FiscalPeriod extends Model<FiscalPeriod> {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.BIGINT })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  fiscalYear!: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  periodNumber!: number;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: FiscalPeriodType.MONTHLY })
  periodType!: FiscalPeriodType;

  @Column({ type: DataType.STRING(100), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  startDate!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  endDate!: string;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: FiscalPeriodStatus.OPEN })
  status!: FiscalPeriodStatus;

  @Column({ type: DataType.UUID, allowNull: true })
  closedBy!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  closedAt!: Date | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  version!: number;

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date;
}
