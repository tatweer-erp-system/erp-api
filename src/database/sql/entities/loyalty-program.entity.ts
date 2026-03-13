import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'loyalty_programs',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class LoyaltyProgram extends TenantAwareEntity<LoyaltyProgram> {
  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;

  @Column({
    type: DataType.DECIMAL(10, 4),
    allowNull: false,
    defaultValue: 1.0,
  })
  pointsPerCurrency!: number;

  @Column({
    type: DataType.DECIMAL(10, 4),
    allowNull: false,
    defaultValue: 0.05,
  })
  currencyPerPoint!: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  expiryDays!: number | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 100,
  })
  minRedeemPoints!: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 50.0,
  })
  maxRedeemPct!: number;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  settings!: Record<string, unknown>;
}
