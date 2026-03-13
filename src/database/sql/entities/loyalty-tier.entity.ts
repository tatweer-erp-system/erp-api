import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'loyalty_tiers',
  timestamps: true,
  paranoid: false,
  schema: 'public',
  updatedAt: false,
})
export class LoyaltyTier extends Model<LoyaltyTier> {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false })
  programId!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  name!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  minPoints!: number;

  @Column({
    type: DataType.DECIMAL(10, 4),
    allowNull: false,
    defaultValue: 1.0,
  })
  earnMultiplier!: number;

  @Column({
    type: DataType.DECIMAL(10, 4),
    allowNull: false,
    defaultValue: 1.0,
  })
  redeemMultiplier!: number;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: '#CD7F32' })
  color!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  benefits!: unknown[];

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sortOrder!: number;
}
