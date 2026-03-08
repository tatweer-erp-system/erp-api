import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, UpdatedAt, DeletedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'tasks', timestamps: true, paranoid: true, underscored: true })
export class Task extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;
  @Column({ type: DataType.UUID, allowNull: false, field: 'project_id' }) projectId!: string;
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } }) title!: { en: string; ar: string };
  @Column({ type: DataType.JSONB, allowNull: true }) description!: { en: string; ar: string } | null;
  @Column({ type: DataType.STRING(20), defaultValue: 'todo' }) status!: string;
  @Column({ type: DataType.STRING(20), defaultValue: 'medium' }) priority!: string;
  @Column({ type: DataType.UUID, allowNull: true, field: 'assigned_to' }) assignedTo!: string | null;
  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'due_date' }) dueDate!: string | null;
  @Column({ type: DataType.INTEGER, defaultValue: 0, field: 'estimated_hours' }) estimatedHours!: number;
  @Column({ type: DataType.INTEGER, defaultValue: 0, field: 'logged_hours' }) loggedHours!: number;
  @Column({ type: DataType.UUID, allowNull: true, field: 'parent_task_id' }) parentTaskId!: string | null;
  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' }) createdBy!: string | null;
  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' }) updatedBy!: string | null;
  @Default(0) @Column(DataType.INTEGER) version!: number;
  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
  @DeletedAt @Column(DataType.DATE) deletedAt!: Date | null;
}
