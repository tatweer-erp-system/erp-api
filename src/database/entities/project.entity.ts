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

@Table({ tableName: 'projects', timestamps: true, paranoid: true, underscored: true })
export class Project extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } })
  name!: { en: string; ar: string };

  @Column({ type: DataType.JSONB, allowNull: true })
  description!: { en: string; ar: string } | null;

  @Column({ type: DataType.STRING(20), defaultValue: 'planning' })
  status!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'start_date' })
  startDate!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'end_date' })
  endDate!: string | null;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: true })
  budget!: number | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'manager_id' })
  managerId!: string | null;

  @Column({ type: DataType.JSONB, defaultValue: [] })
  members!: string[];

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' }) createdBy!: string | null;
  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' }) updatedBy!: string | null;
  @Default(0) @Column(DataType.INTEGER) version!: number;
  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
  @DeletedAt @Column(DataType.DATE) deletedAt!: Date | null;
}
