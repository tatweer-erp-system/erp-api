import { Column, DataType, Table, Model, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'user_roles',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class UserRole extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.BIGINT, allowNull: false })
  roleId!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  updatedBy!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, allowNull: false })
  version!: number;

  @CreatedAt @Column({ type: DataType.DATE }) createdAt!: Date;
  @UpdatedAt @Column({ type: DataType.DATE }) updatedAt!: Date;
}
