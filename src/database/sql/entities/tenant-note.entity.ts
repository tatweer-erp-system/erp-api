import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { TenantNotePriority } from '@/common/enums/tenant.enums';

@Entity({ name: 'tenant_notes' })
export class TenantNote extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'uuid', name: 'admin_id', nullable: true })
  adminId: string | null;

  @Column({ type: 'varchar', length: 100, name: 'created_by_name', nullable: true })
  createdByName: string | null;

  @Column({
    type: 'enum',
    enum: TenantNotePriority,
    default: TenantNotePriority.NORMAL,
  })
  priority: TenantNotePriority;

  @Column({ type: 'uuid', name: 'linked_ticket_id', nullable: true })
  linkedTicketId: string | null;
}
