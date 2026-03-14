import {
  BeforeCreate,
  Column,
  CreatedAt,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';

@Table({
  tableName: 'pos_payments',
  timestamps: true,
  paranoid: false,
  schema: 'public',
  updatedAt: false,
})
export class PosPayment extends Model {
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: () => uuidv7() })
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  orderId!: string;

  @Column({ type: DataType.STRING(30), allowNull: false })
  method!: string;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  amount!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  amountGiven!: number | null;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  })
  changeAmount!: number;

  @Column({ type: DataType.STRING(100), allowNull: true })
  reference!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  giftCardId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date;

  @BeforeCreate
  static generateUUID(instance: PosPayment) {
    if (!instance.id) {
      instance.id = uuidv7();
    }
  }
}
