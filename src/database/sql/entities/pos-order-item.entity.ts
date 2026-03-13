import { Column, CreatedAt, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'pos_order_items',
  timestamps: true,
  paranoid: false,
  schema: 'public',
  updatedAt: false,
})
export class PosOrderItem extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false })
  orderId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  productId!: string | null;

  @Column({ type: DataType.STRING(200), allowNull: false })
  productName!: string;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  unitPrice!: number;

  @Column({ type: DataType.DECIMAL(10, 3), allowNull: false })
  quantity!: number;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  })
  discountAmount!: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 15 })
  taxRate!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  taxAmount!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  lineTotal!: number;

  @Column({ type: DataType.STRING(30), allowNull: true })
  course!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  firedAt!: Date | null;

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date;
}
