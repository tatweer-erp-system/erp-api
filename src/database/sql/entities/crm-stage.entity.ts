import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'crm_stages',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class CrmStage extends TenantAwareEntity<CrmStage> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sequence!: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 20 })
  probability!: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isWon!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isFolded!: boolean;
}
