import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'task_time_entries',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class TaskTimeEntry extends TenantAwareEntity<TaskTimeEntry> {
  @Column({ type: DataType.UUID, allowNull: false })
  taskId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false })
  hours!: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  entryDate!: string;
}
