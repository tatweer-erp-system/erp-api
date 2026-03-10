import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, UpdatedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'stock_levels', timestamps: true, paranoid: false, underscored: true })
export class StockLevel extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'product_id' })
  productId!: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'warehouse_id' })
  warehouseId!: string;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false, defaultValue: 0 })
  quantity!: number;

  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false, defaultValue: 0, field: 'reserved_quantity' })
  reservedQuantity!: number;

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
}
