import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { FiscalPosition } from './fiscal-position.entity';

@Table({
  tableName: 'fiscal_position_accounts',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class FiscalPositionAccount extends TenantAwareEntity<FiscalPositionAccount> {
  @ForeignKey(() => FiscalPosition)
  @Column({ type: DataType.UUID, allowNull: false })
  fiscalPositionId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  accountSrcId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  accountDestId!: string;

  @BelongsTo(() => FiscalPosition)
  fiscalPosition!: FiscalPosition;
}
