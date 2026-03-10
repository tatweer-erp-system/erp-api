import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, UpdatedAt, DeletedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'purchase_orders', timestamps: true, paranoid: true, underscored: true })
export class PurchaseOrder extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, unique: true, field: 'order_number' })
  orderNumber!: string;

  @Column({ type: DataType.UUID, allowNull: true, field: 'vendor_id' })
  vendorId!: string | null;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0 })
  subtotal!: number;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'tax_amount' })
  taxAmount!: number;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'total_amount' })
  totalAmount!: number;

  @Column({ type: DataType.STRING(10), defaultValue: 'SAR' })
  currency!: string;

  @Column({ type: DataType.STRING(20), defaultValue: 'draft' })
  status!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'expected_delivery_date' })
  expectedDeliveryDate!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' }) createdBy!: string | null;
  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' }) updatedBy!: string | null;
  @Default(0) @Column(DataType.INTEGER) version!: number;
  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
  @DeletedAt @Column(DataType.DATE) deletedAt!: Date | null;
}
