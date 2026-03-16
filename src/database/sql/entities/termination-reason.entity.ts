import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { TerminationType } from '@/common/enums/definitions.enums';

@Table({
  tableName: 'termination_reasons',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class TerminationReason extends TenantAwareEntity<TerminationReason> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, defaultValue: TerminationType.VOLUNTARY })
  type!: TerminationType;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
