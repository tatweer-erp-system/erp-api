import { Column, DataType, Table, Model, CreatedAt, UpdatedAt } from 'sequelize-typescript';

// ProjectMember entity - BIGSERIAL PK (not UUID)
// Unique constraint: (project_id, user_id)
@Table({
  tableName: 'project_members',
  timestamps: true,
  paranoid: false,
  underscored: true,
  schema: 'public',
  indexes: [{ unique: true, fields: ['project_id', 'user_id'] }],
})
export class ProjectMember extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false, field: 'tenant_id' })
  tenantId!: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'project_id' })
  projectId!: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id' })
  userId!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, defaultValue: 'member' })
  role!: string;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' })
  updatedBy!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, allowNull: false })
  version!: number;

  @CreatedAt @Column({ type: DataType.DATE, field: 'created_at' }) createdAt!: Date;
  @UpdatedAt @Column({ type: DataType.DATE, field: 'updated_at' }) updatedAt!: Date;
}
