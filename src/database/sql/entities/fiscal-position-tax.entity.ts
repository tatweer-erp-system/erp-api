import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { FiscalPosition } from './fiscal-position.entity';

@Table({
  tableName: 'fiscal_position_taxes',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class FiscalPositionTax extends TenantAwareEntity<FiscalPositionTax> {
  @ForeignKey(() => FiscalPosition)
  @Column({ type: DataType.UUID, allowNull: false })
  fiscalPositionId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  taxSrcId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  taxDestId!: string | null;

  @BelongsTo(() => FiscalPosition)
  fiscalPosition!: FiscalPosition;
}
