import {
  Column,
  DataType,
  Table,
  Model,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';

// Composite unique index on (tenant_id, name) enforced at the database level
@Table({
  tableName: 'roles',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
  indexes: [{ unique: true, fields: ['tenant_id', 'name'] }],
})
export class Role extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false, field: 'tenant_id' })
  tenantId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: string | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'is_system' })
  isSystem!: boolean;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' })
  updatedBy!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, allowNull: false })
  version!: number;

  @CreatedAt @Column({ type: DataType.DATE, field: 'created_at' }) createdAt!: Date;
  @UpdatedAt @Column({ type: DataType.DATE, field: 'updated_at' }) updatedAt!: Date;
  @DeletedAt @Column({ type: DataType.DATE, field: 'deleted_at' }) deletedAt!: Date | null;
}
