import { Column, DataType, Model, PrimaryKey, Default, Table, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'audit_logs', timestamps: true, paranoid: false, underscored: true })
export class AuditLog extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'tenant_slug' })
  tenantSlug!: string;

  @Column({ type: DataType.UUID, allowNull: true, field: 'user_id' })
  userId!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: false })
  action!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  module!: string;

  @Column({ type: DataType.UUID, allowNull: true, field: 'record_id' })
  recordId!: string | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  before!: Record<string, unknown> | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  after!: Record<string, unknown> | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  ip!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'user_agent' })
  userAgent!: string | null;

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
}
