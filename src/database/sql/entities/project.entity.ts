import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'projects',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Project extends TenantAwareEntity<Project> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionAr!: string | null;

  @Column({ type: DataType.STRING(20), defaultValue: 'planning' })
  status!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  startDate!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  endDate!: string | null;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: true })
  budget!: number | null;

  @Column({ type: DataType.UUID, allowNull: true })
  managerId!: string | null;

  // members field removed — replaced by project_members table
}
