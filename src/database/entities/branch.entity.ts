import {
  Column,
  DataType,
  Table,
  Default,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Model,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'branches', timestamps: true, paranoid: true, underscored: true })
export class Branch extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  code!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'is_default' })
  isDefault!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_active' })
  isActive!: boolean;

  @Column({ type: DataType.STRING(500), allowNull: true })
  address!: string | null;

  @Column({ type: DataType.STRING(30), allowNull: true })
  phone!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' })
  updatedBy!: string | null;

  @Default(0) @Column(DataType.INTEGER) version!: number;
  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
  @DeletedAt @Column(DataType.DATE) deletedAt!: Date | null;
}
