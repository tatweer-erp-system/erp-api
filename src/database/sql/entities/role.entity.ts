import {
  Column,
  DataType,
  Table,
  Model,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';

// Composite unique index on (tenantId, nameEn) enforced at the database level
@Table({
  tableName: 'roles',
  timestamps: true,
  paranoid: true,
  schema: 'public',
  indexes: [{ unique: true, fields: ['tenantId', 'nameEn'] }],
})
export class Role extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  descriptionAr!: string | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isSystem!: boolean;

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
