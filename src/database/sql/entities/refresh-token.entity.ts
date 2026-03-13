import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'refresh_tokens',
  timestamps: true,
  paranoid: false,
  updatedAt: false,
  schema: 'public',
})
export class RefreshToken extends TenantAwareEntity<RefreshToken> {
  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  tenantSlug!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  tokenHash!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  family!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  revoked!: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  revokedAt!: Date | null;

  @Column({ type: DataType.DATE, allowNull: false })
  expiresAt!: Date;

  @Column({ type: DataType.STRING(50), allowNull: true })
  ipAddress!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  userAgent!: string | null;
}
