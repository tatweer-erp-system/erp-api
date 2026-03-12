import { Column, DataType, Table, Model, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'role_permissions',
  timestamps: true,
  paranoid: false,
  underscored: true,
  schema: 'public',
})
export class RolePermission extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false, field: 'tenant_id' })
  tenantId!: string;

  @Column({ type: DataType.BIGINT, allowNull: false, field: 'role_id' })
  roleId!: number;

  @Column({ type: DataType.BIGINT, allowNull: false, field: 'permission_id' })
  permissionId!: number;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' })
  updatedBy!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, allowNull: false })
  version!: number;

  @CreatedAt @Column({ type: DataType.DATE, field: 'created_at' }) createdAt!: Date;
  @UpdatedAt @Column({ type: DataType.DATE, field: 'updated_at' }) updatedAt!: Date;
}
