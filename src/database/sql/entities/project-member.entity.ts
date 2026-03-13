import { Column, DataType, Table, Model, CreatedAt, UpdatedAt } from 'sequelize-typescript';

// ProjectMember entity - BIGSERIAL PK (not UUID)
// Unique constraint: (project_id, userId)
@Table({
  tableName: 'project_members',
  timestamps: true,
  paranoid: false,
  schema: 'public',
  indexes: [{ unique: true, fields: ['projectId', 'userId'] }],
})
export class ProjectMember extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  projectId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, defaultValue: 'member' })
  role!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  updatedBy!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, allowNull: false })
  version!: number;

  @CreatedAt @Column({ type: DataType.DATE }) createdAt!: Date;
  @UpdatedAt @Column({ type: DataType.DATE }) updatedAt!: Date;
}
