import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'products',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Product extends TenantAwareEntity<Product> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionAr!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  sku!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  barcode!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  categoryId!: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  unitPrice!: number;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  costPrice!: number | null;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: 'SAR' })
  currency!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: 'pcs',
  })
  unitOfMeasure!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  reorderPoint!: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 15 })
  taxRate!: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive!: boolean;

  @Column({ type: DataType.JSONB, allowNull: true })
  images!: string[] | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: 'storable',
  })
  productType!: 'storable' | 'consumable' | 'service' | 'combo';

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: 'ordered',
  })
  invoicePolicy!: 'ordered' | 'delivered';

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  canBeSold!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  canBePurchased!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  hasVariants!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  hasSerialTracking!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  hasLotTracking!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  hasExpiryDate!: boolean;

  @Column({ type: DataType.DECIMAL(10, 3), allowNull: true })
  reorderMinQty!: number | null;

  @Column({ type: DataType.DECIMAL(10, 3), allowNull: true })
  reorderQty!: number | null;

  @Column({ type: DataType.UUID, allowNull: true })
  brandId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  purchaseUomId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  incomeAccountId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  cogsAccountId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  inventoryAccountId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  stockInputAccountId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  stockOutputAccountId!: string | null;
}
