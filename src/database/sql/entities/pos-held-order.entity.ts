import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'pos_held_orders' })
export class PosHeldOrder extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id', nullable: true })
  branchId: string | null;

  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  /** Alias used by legacy service code */
  @Column({ type: 'varchar', length: 255, name: 'tab_label', nullable: true })
  tabLabel: string | null;

  @Column({ type: 'jsonb', name: 'order_data', nullable: true })
  orderData: any;

  /** Alias used by legacy service code */
  @Column({ type: 'jsonb', name: 'cart_snapshot', nullable: true })
  cartSnapshot: any;

  @Column({ type: 'uuid', name: 'cashier_id', nullable: true })
  cashierId: string | null;
}
