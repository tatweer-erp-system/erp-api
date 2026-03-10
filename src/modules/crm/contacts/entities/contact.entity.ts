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

@Table({ tableName: 'contacts', timestamps: true, paranoid: true, underscored: true })
export class Contact extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'first_name' }) firstName!: string;
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'last_name' }) lastName!: string;
  @Column({ type: DataType.STRING(255), allowNull: true }) email!: string | null;
  @Column({ type: DataType.STRING(30), allowNull: true }) phone!: string | null;
  @Column({ type: DataType.STRING(255), allowNull: true }) company!: string | null;
  @Column({ type: DataType.STRING(100), allowNull: true }) position!: string | null;
  @Column({ type: DataType.TEXT, allowNull: true }) notes!: string | null;
  @Column({ type: DataType.STRING(20), defaultValue: 'active' }) status!: string;
  @Column({ type: DataType.UUID, allowNull: true, field: 'assigned_to' }) assignedTo!:
    | string
    | null;
  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' }) createdBy!: string | null;
  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' }) updatedBy!: string | null;
  @Default(0) @Column(DataType.INTEGER) version!: number;
  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
  @DeletedAt @Column(DataType.DATE) deletedAt!: Date | null;
}
