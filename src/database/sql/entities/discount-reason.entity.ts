import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'discount_reasons',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class DiscountReason extends TenantAwareEntity<DiscountReason> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true })
  maxPercent!: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  requiresApproval!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
