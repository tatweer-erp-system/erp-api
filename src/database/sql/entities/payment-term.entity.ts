import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'payment_terms',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class PaymentTerm extends TenantAwareEntity<PaymentTerm> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionAr!: string | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 30 })
  daysDue!: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true, defaultValue: 0 })
  penaltyPercentage!: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
