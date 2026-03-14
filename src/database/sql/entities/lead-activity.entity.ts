import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { LeadActivityType, LeadStatus } from '@/common/enums/crm.enums';

@Table({
  tableName: 'lead_activities',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class LeadActivity extends TenantAwareEntity<LeadActivity> {
  @Column({ type: DataType.UUID, allowNull: false })
  leadId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  activityType!: LeadActivityType;

  @Column({ type: DataType.STRING(50), allowNull: true })
  fromStatus!: LeadStatus | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  toStatus!: LeadStatus | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;
}
