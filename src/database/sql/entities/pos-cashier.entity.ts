import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'pos_cashiers',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class PosCashier extends TenantAwareEntity<PosCashier> {
  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  pinHash!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  displayName!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 10,
  })
  maxDiscountPct!: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  canRefund!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  canVoid!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  canOpenDrawer!: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  failedPinAttempts!: number;

  @Column({ type: DataType.DATE, allowNull: true })
  lockedUntil!: Date | null;
}
