import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

// Sequence entity for auto-numbering (SO-00042, PO-00001, EMP-0001, etc.)
// Unique constraint: (tenant_id, branch_id, entity)
@Table({
  tableName: 'sequences',
  timestamps: true,
  paranoid: false,
  underscored: true,
  schema: 'public',
  indexes: [{ unique: true, fields: ['tenant_id', 'branch_id', 'entity'] }],
})
export class Sequence extends TenantAwareEntity<Sequence> {
  @Column({ type: DataType.UUID, allowNull: true, field: 'branch_id' })
  branchId!: string | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    comment: 'sales_order | purchase_order | employee | lead | project | zatca_invoice',
  })
  entity!: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  prefix!: string;

  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0, field: 'last_value' })
  lastValue!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 5 })
  padding!: number;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: 'never',
    field: 'reset_cycle',
    comment: 'never | yearly | monthly',
  })
  resetCycle!: string;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'fiscal_year' })
  fiscalYear!: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'fiscal_month' })
  fiscalMonth!: number | null;
}
