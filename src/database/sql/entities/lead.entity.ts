import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { LeadType, LeadPriority, LeadSource } from '@/common/enums/crm.enums';

@Table({
  tableName: 'leads',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Lead extends TenantAwareEntity<Lead> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  title!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  stageId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  partnerId!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: LeadType.LEAD })
  type!: LeadType;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true })
  probability!: number | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  expectedRevenue!: number | null;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  expectedRevenueBase!: number | null;

  @Column({ type: DataType.STRING(50), defaultValue: LeadPriority.MEDIUM })
  priority!: LeadPriority;

  @Column({ type: DataType.UUID, allowNull: true })
  assignedTo!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  expectedCloseDate!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  source!: LeadSource | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  campaign!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  medium!: string | null;

  @Column({ type: DataType.ARRAY(DataType.TEXT), allowNull: true })
  tags!: string[] | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isWon!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isLost!: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  lostReason!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  wonAt!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  lostAt!: Date | null;

  @Column({ type: DataType.UUID, allowNull: true })
  saleOrderId!: string | null;
}
