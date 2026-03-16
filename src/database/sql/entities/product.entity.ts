import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { ProductType, InvoicePolicy } from '@/common/enums/inventory.enums';

@Entity({ name: 'products' })
export class Product extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' }) nameEn: string;
  @Column({ type: 'varchar', length: 255, name: 'name_ar' }) nameAr: string;
  @Index() @Column({ type: 'varchar', length: 100, nullable: true }) reference: string | null;
  @Index() @Column({ type: 'varchar', length: 100, nullable: true }) barcode: string | null;
  @Column({ type: 'enum', enum: ProductType, default: ProductType.STORABLE }) type: ProductType;
  get productType(): ProductType {
    return this.type;
  }
  @Column({ type: 'uuid', name: 'category_id', nullable: true }) categoryId: string | null;
  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'sale_price', default: 0 })
  salePrice: number;
  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'cost_price', default: 0 })
  costPrice: number;
  @Column({ type: 'uuid', name: 'uom_id', nullable: true }) uomId: string | null;
  @Column({ type: 'uuid', name: 'purchase_uom_id', nullable: true }) purchaseUomId: string | null;
  @Column({ type: 'uuid', name: 'tax_id', nullable: true }) taxId: string | null;
  @Column({ type: 'boolean', name: 'can_be_sold', default: true }) canBeSold: boolean;
  @Column({ type: 'boolean', name: 'can_be_purchased', default: true }) canBePurchased: boolean;
  @Column({
    type: 'enum',
    enum: InvoicePolicy,
    name: 'invoice_policy',
    default: InvoicePolicy.ORDERED,
  })
  invoicePolicy: InvoicePolicy;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'text', name: 'purchase_description', nullable: true }) purchaseDescription:
    | string
    | null;
  @Column({ type: 'varchar', length: 500, name: 'image_url', nullable: true }) imageUrl:
    | string
    | null;
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
}
