import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'gift_cards',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class GiftCard extends TenantAwareEntity<GiftCard> {
  @Column({ type: DataType.STRING(50), allowNull: false })
  code!: string;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  initialBalance!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  currentBalance!: number;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: 'SAR' })
  currency!: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  recipientName!: string | null;

  @Column({ type: DataType.STRING(200), allowNull: true })
  recipientEmail!: string | null;

  @Column({ type: DataType.STRING(30), allowNull: true })
  recipientPhone!: string | null;

  @Column({ type: DataType.UUID, allowNull: false })
  issuedBy!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  issuedOrderId!: string | null;

  @Column({ type: DataType.DATE, allowNull: false })
  issuedAt!: Date;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  expiresAt!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
