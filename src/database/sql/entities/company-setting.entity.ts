import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'company_settings',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class CompanySetting extends TenantAwareEntity<CompanySetting> {
  // ─── Accounting defaults ──────────────────────────────────────────────
  @Column({ type: DataType.UUID, allowNull: true })
  defaultARAccountId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  defaultAPAccountId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  defaultCOGSAccountId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  defaultInventoryAccountId!: string | null;

  // ─── Tax & fiscal ─────────────────────────────────────────────────────
  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'invoice_basis' })
  taxExigibility!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  fiscalLockDate!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  taxLockDate!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  angloSaxonAccounting!: boolean;

  // ─── Inventory ────────────────────────────────────────────────────────
  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'avco' })
  stockCostingMethod!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  negativeStockBlock!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  autoReorder!: boolean;

  // ─── Sales & invoicing ────────────────────────────────────────────────
  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'on_delivery' })
  invoicePolicy!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  creditLimitBlock!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  creditLimitWarning!: boolean;

  // ─── Purchasing ───────────────────────────────────────────────────────
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  threeWayMatch!: boolean;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 0 })
  threeWayMatchTolerance!: number;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'on_receipt' })
  billControl!: string;

  // ─── HR & payroll ─────────────────────────────────────────────────────
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 22 })
  workDaysPerMonth!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 8 })
  workHoursPerDay!: number;

  @Column({ type: DataType.DECIMAL(4, 2), allowNull: false, defaultValue: 1.5 })
  overtimeRate!: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  lateDeductionEnabled!: boolean;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  lateToleranceMinutes!: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 9.75 })
  gosiEmployeePct!: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 11.75 })
  gosiEmployerPct!: number;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'bracket' })
  incomeTaxMethod!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  eoscEnabled!: boolean;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'last_wage' })
  eoscBase!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  negativeLeaveAllowed!: boolean;
}
