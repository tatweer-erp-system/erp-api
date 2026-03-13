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
  schema: 'public',
})
export class Department extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4 })
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } })
  name!: { en: string; ar: string };

  @Column({ type: DataType.JSONB, allowNull: true })
  description!: { en: string; ar: string } | null;

  @Column({ type: DataType.UUID, allowNull: true })
  parentId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  managerId!: string | null;

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
