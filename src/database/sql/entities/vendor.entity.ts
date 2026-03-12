import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'vendors',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class Vendor extends TenantAwareEntity<Vendor> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  email!: string | null;

  @Column({ type: DataType.STRING(30), allowNull: true })
  phone!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  address!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true, field: 'tax_number' })
  taxNumber!: string | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_active' })
  isActive!: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;
}
