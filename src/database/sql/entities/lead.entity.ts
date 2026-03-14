import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { LeadStatus, LeadPriority } from '@/common/enums/crm.enums';

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
  contactId!: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  value!: number | null;

  @Column({ type: DataType.STRING(10), defaultValue: 'SAR' })
  currency!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  valueBase!: number | null;

  @Column({ type: DataType.STRING(50), defaultValue: LeadStatus.NEW })
  status!: LeadStatus;

  @Column({ type: DataType.STRING(50), defaultValue: LeadPriority.MEDIUM })
  priority!: LeadPriority;

  @Column({ type: DataType.UUID, allowNull: true })
  assignedTo!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  expectedCloseDate!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  lostReason!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  wonAt!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  lostAt!: Date | null;
}
