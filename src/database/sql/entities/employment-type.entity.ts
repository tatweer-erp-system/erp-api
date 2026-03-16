import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'employment_types',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class EmploymentTypeConfig extends TenantAwareEntity<EmploymentTypeConfig> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionAr!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
