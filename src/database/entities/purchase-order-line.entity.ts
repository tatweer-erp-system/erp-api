import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, UpdatedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'purchase_order_lines', timestamps: true, paranoid: false, underscored: true })
export class PurchaseOrderLine extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;

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

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
}
