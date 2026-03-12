import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'refresh_tokens',
  timestamps: true,
  paranoid: false,
  underscored: true,
  updatedAt: false,
  schema: 'public',
})
export class RefreshToken extends TenantAwareEntity<RefreshToken> {
  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id' })
  userId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'tenant_slug' })
  tenantSlug!: string;

  @Column({ type: DataType.STRING(255), allowNull: false, field: 'token_hash' })
  tokenHash!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  family!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  revoked!: boolean;

  @Column({ type: DataType.DATE, allowNull: true, field: 'revoked_at' })
  revokedAt!: Date | null;

  @Column({ type: DataType.DATE, allowNull: false, field: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: DataType.STRING(50), allowNull: true, field: 'ip_address' })
  ipAddress!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'user_agent' })
  userAgent!: string | null;
}
