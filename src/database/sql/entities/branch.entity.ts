import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'branches',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class Branch extends TenantAwareEntity<Branch> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  code!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'is_main' })
  isMain!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_active' })
  isActive!: boolean;

  @Column({ type: DataType.STRING(500), allowNull: true })
  address!: string | null;

  @Column({ type: DataType.STRING(30), allowNull: true })
  phone!: string | null;
}
