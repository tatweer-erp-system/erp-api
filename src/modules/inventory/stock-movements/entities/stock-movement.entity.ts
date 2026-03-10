import {
  Column,
  DataType,
  Table,
  Default,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  Model,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'stock_movements', timestamps: true, paranoid: false, underscored: true })
export class StockMovement extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;
  @Column({ type: DataType.UUID, allowNull: false, field: 'product_id' }) productId!: string;
  @Column({ type: DataType.UUID, allowNull: false, field: 'warehouse_id' }) warehouseId!: string;
  @Column({ type: DataType.STRING(50), allowNull: false, field: 'movement_type' })
  movementType!: string;
  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false }) quantity!: number;
  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false, field: 'quantity_before' })
  quantityBefore!: number;
  @Column({ type: DataType.DECIMAL(12, 3), allowNull: false, field: 'quantity_after' })
  quantityAfter!: number;
  @Column({ type: DataType.TEXT, allowNull: true }) notes!: string | null;
  @Column({ type: DataType.UUID, allowNull: true, field: 'reference_id' }) referenceId!:
    | string
    | null;
  @Column({ type: DataType.STRING(50), allowNull: true, field: 'reference_type' }) referenceType!:
    | string
    | null;
  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' }) createdBy!: string | null;
  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
}
