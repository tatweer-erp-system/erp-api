import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'cancellation_reasons',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class CancellationReason extends TenantAwareEntity<CancellationReason> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  requiresApproval!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
