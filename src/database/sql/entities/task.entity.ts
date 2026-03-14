import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'tasks',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Task extends TenantAwareEntity<Task> {
  @Column({ type: DataType.UUID, allowNull: false })
  projectId!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  titleEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  titleAr!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  descriptionAr!: string | null;

  @Column({ type: DataType.STRING(20), defaultValue: 'todo' })
  status!: string;

  @Column({ type: DataType.STRING(20), defaultValue: 'medium' })
  priority!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  assignedTo!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  dueDate!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  estimatedHours!: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  loggedHours!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  parentTaskId!: string | null;
}
