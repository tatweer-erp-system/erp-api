import { Column, DataType, Table, BeforeCreate } from 'sequelize-typescript';
import { Model } from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';

@Table({
  tableName: 'loyalty_accounts',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class LoyaltyAccount extends Model<LoyaltyAccount> {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: () => uuidv7() })
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  customerId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  programId!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  currentPoints!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  lifetimePoints!: number;

  @Column({ type: DataType.BIGINT, allowNull: true })
  tierId!: number | null;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  enrolledAt!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  lastActivityAt!: Date | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  version!: number;

  @BeforeCreate
  static generateUUID(instance: LoyaltyAccount) {
    if (!instance.id) {
      instance.id = uuidv7();
    }
  }
}
