import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { PartnerType } from '@/common/enums/inventory.enums';

@Entity({ name: 'partners' })
export class Partner extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' }) nameEn: string;
  @Column({ type: 'varchar', length: 255, name: 'name_ar' }) nameAr: string;
  @Column({ type: 'enum', enum: PartnerType, default: PartnerType.CUSTOMER }) type: PartnerType;
  @Column({ type: 'varchar', length: 50, nullable: true }) phone: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) mobile: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) email: string | null;
  @Column({ type: 'varchar', length: 100, name: 'tax_number', nullable: true }) taxNumber:
    | string
    | null;
  @Column({ type: 'boolean', name: 'is_customer', default: false }) isCustomer: boolean;
  @Column({ type: 'boolean', name: 'is_supplier', default: false }) isSupplier: boolean;
  @Column({ type: 'uuid', name: 'pricelist_id', nullable: true }) pricelistId: string | null;
  @Column({ type: 'uuid', name: 'payment_term_id', nullable: true }) paymentTermId: string | null;
  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'credit_limit', nullable: true })
  creditLimit: number | null;
  @Column({ type: 'uuid', name: 'ar_account_id', nullable: true }) arAccountId: string | null;
  @Column({ type: 'uuid', name: 'ap_account_id', nullable: true }) apAccountId: string | null;
  @Column({ type: 'text', nullable: true }) address: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) city: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) country: string | null;
  @Column({ type: 'uuid', name: 'sales_rep_id', nullable: true }) salesRepId: string | null;
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
}
