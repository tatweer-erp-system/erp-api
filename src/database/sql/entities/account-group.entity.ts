import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'account_groups',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class AccountGroup extends TenantAwareEntity<AccountGroup> {
  @Column({ type: DataType.STRING(10), allowNull: false })
  codePrefix!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  parentId!: string | null;
}
