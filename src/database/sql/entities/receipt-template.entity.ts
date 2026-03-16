import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'receipt_templates',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class ReceiptTemplate extends TenantAwareEntity<ReceiptTemplate> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  headerTextEn!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  headerTextAr!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  footerTextEn!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  footerTextAr!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  showLogo!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  showTaxDetails!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  showBarcode!: boolean;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
  copies!: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isDefault!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
