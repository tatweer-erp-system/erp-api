import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { PosSessionStatus } from '@/common/enums/pos.enums';

@Entity({ name: 'pos_sessions' })
export class PosSession extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'branch_id' })
  branchId: string;

  @Column({ type: 'uuid', name: 'terminal_id', nullable: true })
  terminalId: string | null;

  @Column({ type: 'uuid', name: 'cashier_id' })
  cashierId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'enum', enum: PosSessionStatus, default: PosSessionStatus.OPEN })
  status: PosSessionStatus;

  @Column({ type: 'timestamptz', name: 'opened_at' })
  openedAt: Date;

  @Column({ type: 'timestamptz', name: 'closed_at', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'opening_balance', default: 0 })
  openingBalance: number;

  /** Alias used by legacy Sequelize-era service code */
  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'opening_float', nullable: true })
  openingFloat: number | null;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'closing_balance', nullable: true })
  closingBalance: number | null;

  /** Alias used by legacy Sequelize-era service code */
  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'closing_float', nullable: true })
  closingFloat: number | null;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'expected_balance', nullable: true })
  expectedBalance: number | null;

  /** Alias used by legacy Sequelize-era service code */
  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'expected_float', nullable: true })
  expectedFloat: number | null;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'float_difference', nullable: true })
  floatDifference: number | null;

  @Column({ type: 'decimal', precision: 20, scale: 4, name: 'total_sales', default: 0 })
  totalSales: number;

  @Column({ type: 'int', name: 'total_orders', default: 0 })
  totalOrders: number;

  @Column({ type: 'text', name: 'closing_notes', nullable: true })
  closingNotes: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
