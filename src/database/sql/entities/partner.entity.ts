import { Column, DataType, Table, HasMany } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { PartnerType } from '@/common/enums/partner.enums';
import { PartnerContact } from './partner-contact.entity';

@Table({
  tableName: 'partners',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Partner extends TenantAwareEntity<Partner> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: PartnerType.CUSTOMER })
  type!: PartnerType;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isCustomer!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isSupplier!: boolean;

  @Column({ type: DataType.STRING(50), allowNull: true })
  taxNumber!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  vatNumber!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  phone!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  mobile!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  email!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  website!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  street!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  city!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  state!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true, defaultValue: 'Saudi Arabia' })
  country!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  zip!: string | null;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false, defaultValue: 0 })
  creditLimit!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  paymentTermId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  pricelistId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  arAccountId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  apAccountId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  fiscalPositionId!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  bankIban!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  bankName!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;

  @HasMany(() => PartnerContact)
  contacts!: PartnerContact[];
}
