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
  tableName: 'permissions',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Permission extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  module!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  action!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: string | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  conditions!: Record<string, unknown> | null;

  @Column({ type: DataType.UUID, allowNull: true })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  updatedBy!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, allowNull: false })
  version!: number;

  @CreatedAt @Column({ type: DataType.DATE }) createdAt!: Date;
  @UpdatedAt @Column({ type: DataType.DATE }) updatedAt!: Date;
  @DeletedAt @Column({ type: DataType.DATE }) deletedAt!: Date | null;
}
