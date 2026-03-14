import { Column, DataType, Table, Model, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'purchase_order_lines',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class PurchaseOrderLine extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  orderId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  productId!: string | null;

  @Column({ type: DataType.TEXT, allowNull: false })
  description!: string;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false })
  quantity!: number;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
  unitPrice!: number;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0 })
  taxAmount!: number;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0 })
  lineTotal!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  lineTotalBase!: number | null;

  @Column({ type: DataType.DECIMAL(15, 3), allowNull: false, defaultValue: 0 })
  receivedQuantity!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  discountAmount!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  updatedBy!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, allowNull: false })
  version!: number;

  @CreatedAt @Column({ type: DataType.DATE }) createdAt!: Date;
  @UpdatedAt @Column({ type: DataType.DATE }) updatedAt!: Date;
}
