import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { CrmLeadStatus, CrmLeadSource } from '@/common/enums/crm.enums';

@Entity({ name: 'crm_leads' })
export class CrmLead extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'uuid', name: 'partner_id', nullable: true })
  partnerId: string | null;

  @Column({ type: 'varchar', length: 255, name: 'contact_name', nullable: true })
  contactName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'uuid', name: 'stage_id' })
  stageId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  probability: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'expected_revenue', default: 0 })
  expectedRevenue: number;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'estimated_budget', nullable: true })
  estimatedBudget: number | null;

  @Column({ type: 'uuid', name: 'assigned_to', nullable: true })
  assignedTo: string | null;

  @Column({ type: 'enum', enum: CrmLeadSource, nullable: true })
  source: CrmLeadSource | null;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'date', name: 'close_date', nullable: true })
  closeDate: Date | null;

  @Column({ type: 'enum', enum: CrmLeadStatus, default: CrmLeadStatus.LEAD })
  status: CrmLeadStatus;

  @Column({ type: 'text', name: 'loss_reason', nullable: true })
  lossReason: string | null;

  @Column({ type: 'timestamptz', name: 'won_at', nullable: true })
  wonAt: Date | null;

  @Column({ type: 'timestamptz', name: 'lost_at', nullable: true })
  lostAt: Date | null;

  @Column({ type: 'uuid', name: 'linked_sales_order_id', nullable: true })
  linkedSalesOrderId: string | null;
}
