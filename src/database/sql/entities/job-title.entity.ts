import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'job_titles',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class JobTitle extends TenantAwareEntity<JobTitle> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  departmentId!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  grade!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
