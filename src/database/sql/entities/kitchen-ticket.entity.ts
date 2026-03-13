import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { KitchenTicketStatus, CourseType } from '@/common/enums/pos.enums';

export interface KitchenItem {
  productId: string;
  name: { en: string; ar: string };
  quantity: number;
  notes?: string;
  modifications?: string[];
}

@Table({
  tableName: 'kitchen_tickets',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class KitchenTicket extends TenantAwareEntity<KitchenTicket> {
  @Column({ type: DataType.UUID, allowNull: false })
  orderId!: string;

  @Column({ type: DataType.STRING(30), allowNull: true })
  course!: CourseType | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: KitchenTicketStatus.PENDING,
  })
  status!: KitchenTicketStatus;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  items!: KitchenItem[];

  @Column({ type: DataType.STRING(50), allowNull: true })
  station!: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  priority!: number | null;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  sentAt!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  startedAt!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  completedAt!: Date | null;
}
