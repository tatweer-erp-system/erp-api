import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'tasks',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class Task extends TenantAwareEntity<Task> {
  @Column({ type: DataType.UUID, allowNull: false, field: 'project_id' })
  projectId!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } })
  title!: { en: string; ar: string };

  @Column({ type: DataType.JSONB, allowNull: true })
  description!: { en: string; ar: string } | null;

  @Column({ type: DataType.STRING(20), defaultValue: 'todo' })
  status!: string;

  @Column({ type: DataType.STRING(20), defaultValue: 'medium' })
  priority!: string;

  @Column({ type: DataType.UUID, allowNull: true, field: 'assigned_to' })
  assignedTo!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'due_date' })
  dueDate!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0, field: 'estimated_hours' })
  estimatedHours!: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0, field: 'logged_hours' })
  loggedHours!: number;

  @Column({ type: DataType.UUID, allowNull: true, field: 'parent_task_id' })
  parentTaskId!: string | null;
}
