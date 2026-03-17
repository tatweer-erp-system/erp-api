import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { SalaryStructureType } from '@/common/enums/hr-new.enums';

@Table({
  tableName: 'salary_structures',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class SalaryStructure extends TenantAwareEntity<SalaryStructure> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: SalaryStructureType.EMPLOYEE,
  })
  type!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  parentId!: string | null;
}
