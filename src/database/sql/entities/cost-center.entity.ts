import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'cost_centers',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class CostCenter extends TenantAwareEntity<CostCenter> {
  @Column({ type: DataType.STRING(20), allowNull: false })
  code!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } })
  name!: { en: string; ar: string };

  @Column({ type: DataType.UUID, allowNull: true })
  parentId!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
