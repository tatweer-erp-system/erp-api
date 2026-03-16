import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { UomType } from '@/common/enums/definitions.enums';

@Table({
  tableName: 'units_of_measure',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class UnitOfMeasure extends TenantAwareEntity<UnitOfMeasure> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  symbol!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, defaultValue: UomType.UNIT })
  uomType!: UomType;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
