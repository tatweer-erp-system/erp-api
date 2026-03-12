import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'api_keys',
  timestamps: true,
  paranoid: false,
  underscored: true,
  schema: 'public',
})
export class ApiKey extends TenantAwareEntity<ApiKey> {
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'tenant_slug' })
  tenantSlug!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(255), allowNull: false, field: 'key_hash' })
  keyHash!: string;

  @Column({ type: DataType.JSONB, defaultValue: [] })
  scopes!: string[];

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_active' })
  isActive!: boolean;

  @Column({ type: DataType.DATE, allowNull: true, field: 'last_used_at' })
  lastUsedAt!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'expires_at' })
  expiresAt!: Date | null;
}
