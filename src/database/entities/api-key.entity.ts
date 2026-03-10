import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, UpdatedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'api_keys', timestamps: true, paranoid: false, underscored: true })
export class ApiKey extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

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

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' })
  createdBy!: string | null;

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
}
