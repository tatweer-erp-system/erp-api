import { Column, DataType, Table, BeforeCreate } from 'sequelize-typescript';
import { Model } from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';

@Table({
  tableName: 'loyalty_transactions',
  timestamps: true,
  paranoid: false,
  schema: 'public',
  updatedAt: false,
})
export class LoyaltyTransaction extends Model<LoyaltyTransaction> {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: () => uuidv7() })
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  accountId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  orderId!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: false })
  type!: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  points!: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  balanceAfter!: number;

  @Column({ type: DataType.STRING(200), allowNull: true })
  description!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  expiresAt!: Date | null;

  @BeforeCreate
  static generateUUID(instance: LoyaltyTransaction) {
    if (!instance.id) {
      instance.id = uuidv7();
    }
  }
}
