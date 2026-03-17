import { Column, DataType, Default, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'supplier_products',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class SupplierProduct extends TenantAwareEntity<SupplierProduct> {
  @Column({ type: DataType.UUID, allowNull: false })
  productId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  partnerId!: string;

  @Default(1)
  @Column({ type: DataType.DECIMAL(18, 4), allowNull: false })
  minQty!: number;

  @Column({ type: DataType.DECIMAL(18, 4), allowNull: false })
  price!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  leadTimeDays!: number;

  @Default(1)
  @Column({ type: DataType.INTEGER, allowNull: false })
  sequence!: number;
}
