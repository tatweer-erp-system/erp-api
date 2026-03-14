import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'branches',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Branch extends TenantAwareEntity<Branch> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionAr!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: false })
  code!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isMain!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive!: boolean;

  @Column({ type: DataType.STRING(500), allowNull: true })
  address!: string | null;

  @Column({ type: DataType.STRING(30), allowNull: true })
  phone!: string | null;
}
