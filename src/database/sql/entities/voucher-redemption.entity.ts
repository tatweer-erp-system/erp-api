import { Column, DataType, Table, PrimaryKey, BeforeCreate, Model } from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';

@Table({
  tableName: 'voucher_redemptions',
  timestamps: false,
  paranoid: false,
  schema: 'public',
})
export class VoucherRedemption extends Model<VoucherRedemption> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: () => uuidv7(),
  })
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  voucherId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  orderId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  customerId!: string | null;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  discountApplied!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  redeemedAt!: Date;

  @BeforeCreate
  static generateUUID(instance: VoucherRedemption) {
    if (!instance.id) {
      instance.id = uuidv7();
    }
  }
}
