import {
  Column,
  DataType,
  Table,
  Model,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'departments',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class Department extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false, field: 'tenant_id' })
  tenantId!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } })
  name!: { en: string; ar: string };

  @Column({ type: DataType.JSONB, allowNull: true })
  description!: { en: string; ar: string } | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'parent_id' })
  parentId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'manager_id' })
  managerId!: string | null;

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
