import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'pos_orders',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class PosOrder extends TenantAwareEntity<PosOrder> {
  @Column({ type: DataType.UUID, allowNull: false })
  sessionId!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  orderNumber!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  customerId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  tableId!: string | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: 'takeaway',
  })
  orderType!: 'takeaway' | 'dine_in' | 'delivery';

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'open' })
  status!: 'open' | 'paid' | 'voided' | 'refunded';

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  subtotal!: number;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  })
  discountAmount!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  taxAmount!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  tipAmount!: number;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  })
  totalAmount!: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  deliveryAddress!: string | null;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  })
  deliveryFee!: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  pointsEarned!: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  pointsRedeemed!: number | null;

  @Column({ type: DataType.DATE, allowNull: true })
  syncedAt!: Date | null;

  @Column({ type: DataType.UUID, allowNull: true })
  pricelistId!: string | null;
}
