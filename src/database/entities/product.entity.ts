import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, UpdatedAt, DeletedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'products', timestamps: true, paranoid: true, underscored: true })
export class Product extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } })
  name!: { en: string; ar: string };

  @Column({ type: DataType.JSONB, allowNull: true })
  description!: { en: string; ar: string } | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  sku!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  barcode!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'category_id' })
  categoryId!: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'unit_price' })
  unitPrice!: number;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true, field: 'cost_price' })
  costPrice!: number | null;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: 'SAR' })
  currency!: string;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'pcs', field: 'unit_of_measure' })
  unitOfMeasure!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'reorder_point' })
  reorderPoint!: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 15, field: 'tax_rate' })
  taxRate!: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_active' })
  isActive!: boolean;

  @Column({ type: DataType.JSONB, allowNull: true })
  images!: string[] | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' }) createdBy!: string | null;
  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' }) updatedBy!: string | null;
  @Default(0) @Column(DataType.INTEGER) version!: number;
  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
  @DeletedAt @Column(DataType.DATE) deletedAt!: Date | null;
}
