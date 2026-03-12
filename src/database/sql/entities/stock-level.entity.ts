import { Column, DataType, Table, Model, CreatedAt, UpdatedAt } from 'sequelize-typescript';

// Composite unique index on (tenant_id, product_id, warehouse_id)
@Table({
  tableName: 'stock_levels',
  timestamps: true,
  paranoid: false,
  underscored: true,
  schema: 'public',
  indexes: [{ unique: true, fields: ['tenant_id', 'product_id', 'warehouse_id'] }],
})
export class StockLevel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false, field: 'tenant_id' })
  tenantId!: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'product_id' })
  productId!: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'warehouse_id' })
  warehouseId!: string;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false, defaultValue: 0 })
  quantity!: number;

  @Column({
    type: DataType.DECIMAL(12, 3),
    allowNull: false,
    defaultValue: 0,
    field: 'reserved_quantity',
  })
  reservedQuantity!: number;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' })
  updatedBy!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, allowNull: false })
  version!: number;

  @CreatedAt @Column({ type: DataType.DATE, field: 'created_at' }) createdAt!: Date;
  @UpdatedAt @Column({ type: DataType.DATE, field: 'updated_at' }) updatedAt!: Date;
}
