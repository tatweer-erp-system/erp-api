import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'warehouses',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class Warehouse extends TenantAwareEntity<Warehouse> {
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } })
  name!: { en: string; ar: string };

  @Column({ type: DataType.STRING(255), allowNull: true })
  location!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'branch_id' })
  branchId!: string | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_active' })
  isActive!: boolean;
}
