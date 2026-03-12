import { Column, DataType, Table, Model, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'purchase_order_lines',
  timestamps: true,
  paranoid: false,
  underscored: true,
  schema: 'public',
})
export class PurchaseOrderLine extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false, field: 'tenant_id' })
  tenantId!: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'order_id' })
  orderId!: string;

  @Column({ type: DataType.UUID, allowNull: true, field: 'product_id' })
  productId!: string | null;

  @Column({ type: DataType.TEXT, allowNull: false })
  description!: string;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false })
  quantity!: number;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, field: 'unit_price' })
  unitPrice!: number;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'tax_amount' })
  taxAmount!: number;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'line_total' })
  lineTotal!: number;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' })
  updatedBy!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, allowNull: false })
  version!: number;

  @CreatedAt @Column({ type: DataType.DATE, field: 'created_at' }) createdAt!: Date;
  @UpdatedAt @Column({ type: DataType.DATE, field: 'updated_at' }) updatedAt!: Date;
}
