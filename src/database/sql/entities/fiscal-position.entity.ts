import { Column, DataType, HasMany, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { FiscalPositionTax } from './fiscal-position-tax.entity';
import { FiscalPositionAccount } from './fiscal-position-account.entity';

@Table({
  tableName: 'fiscal_positions',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class FiscalPosition extends TenantAwareEntity<FiscalPosition> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  autoDetect!: boolean;

  @Column({ type: DataType.STRING(100), allowNull: true })
  country!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  note!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;

  @HasMany(() => FiscalPositionTax)
  taxMappings!: FiscalPositionTax[];

  @HasMany(() => FiscalPositionAccount)
  accountMappings!: FiscalPositionAccount[];
}
