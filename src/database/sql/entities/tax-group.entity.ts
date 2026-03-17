import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'tax_groups',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class TaxGroup extends TenantAwareEntity<TaxGroup> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;
}
