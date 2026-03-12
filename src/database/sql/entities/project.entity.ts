import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'projects',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class Project extends TenantAwareEntity<Project> {
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

  // members field removed — replaced by project_members table
}
