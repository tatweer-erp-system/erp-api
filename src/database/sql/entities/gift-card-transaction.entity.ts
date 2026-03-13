import { Column, DataType, Table, PrimaryKey, BeforeCreate, Model } from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';

@Table({
  tableName: 'gift_card_transactions',
  timestamps: false,
  paranoid: false,
  schema: 'public',
})
export class GiftCardTransaction extends Model<GiftCardTransaction> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: () => uuidv7(),
  })
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  giftCardId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  orderId!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: false })
  type!: string;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  amount!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  balanceAfter!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  createdBy!: string | null;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  createdAt!: Date;

  @BeforeCreate
  static generateUUID(instance: GiftCardTransaction) {
    if (!instance.id) {
      instance.id = uuidv7();
    }
  }
}
