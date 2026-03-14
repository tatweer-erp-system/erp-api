import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'vendors',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Vendor extends TenantAwareEntity<Vendor> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  email!: string | null;

  @Column({ type: DataType.STRING(30), allowNull: true })
  phone!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  address!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  taxNumber!: string | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive!: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 30 })
  paymentTermsDays!: number;

  @Column({ type: DataType.STRING(50), allowNull: true })
  vatNumber!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  crNumber!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  bankName!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  bankIban!: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  rating!: number | null;
}
