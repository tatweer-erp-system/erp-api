import { Column, DataType, Table, Model, CreatedAt, UpdatedAt } from 'sequelize-typescript';

// Composite unique index on (tenantId, productId, warehouseId)
@Table({
  tableName: 'stock_levels',
  timestamps: true,
  paranoid: false,
  schema: 'public',
  indexes: [{ unique: true, fields: ['tenantId', 'productId', 'warehouseId'] }],
})
export class StockLevel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  productId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  warehouseId!: string;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false, defaultValue: 0 })
  quantity!: number;

  @Column({
    type: DataType.DECIMAL(12, 3),
    allowNull: false,
    defaultValue: 0,
  })
  reservedQuantity!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  updatedBy!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, allowNull: false })
  version!: number;

  @CreatedAt @Column({ type: DataType.DATE }) createdAt!: Date;
  @UpdatedAt @Column({ type: DataType.DATE }) updatedAt!: Date;
}
