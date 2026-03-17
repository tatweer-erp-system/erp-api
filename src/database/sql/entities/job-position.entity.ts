import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'job_positions',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class JobPosition extends TenantAwareEntity<JobPosition> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  departmentId!: string | null;
}
