import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'branch_settings',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class BranchSetting extends TenantAwareEntity<BranchSetting> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  key!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  value!: string | null;
}
