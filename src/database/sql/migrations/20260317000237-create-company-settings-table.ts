import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable(
    { tableName: 'company_settings', schema: 'public' },
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      tenantId: { type: DataTypes.UUID, allowNull: false, unique: true },

      // ─── Accounting defaults ────────────────────────────────────────────
      defaultARAccountId: { type: DataTypes.UUID, allowNull: true },
      defaultAPAccountId: { type: DataTypes.UUID, allowNull: true },
      defaultCOGSAccountId: { type: DataTypes.UUID, allowNull: true },
      defaultInventoryAccountId: { type: DataTypes.UUID, allowNull: true },

      // ─── Tax & fiscal ───────────────────────────────────────────────────
      taxExigibility: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'invoice_basis',
      },
      fiscalLockDate: { type: DataTypes.DATEONLY, allowNull: true },
      taxLockDate: { type: DataTypes.DATEONLY, allowNull: true },
      angloSaxonAccounting: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

      // ─── Inventory ──────────────────────────────────────────────────────
      stockCostingMethod: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'avco' },
      negativeStockBlock: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      autoReorder: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

      // ─── Sales & invoicing ──────────────────────────────────────────────
      invoicePolicy: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'on_delivery' },
      creditLimitBlock: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      creditLimitWarning: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

      // ─── Purchasing ─────────────────────────────────────────────────────
      threeWayMatch: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      threeWayMatchTolerance: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      billControl: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'on_receipt' },

      // ─── HR & payroll ───────────────────────────────────────────────────
      workDaysPerMonth: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 22 },
      workHoursPerDay: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 8 },
      overtimeRate: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 1.5 },
      lateDeductionEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      lateToleranceMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      gosiEmployeePct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 9.75 },
      gosiEmployerPct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 11.75 },
      incomeTaxMethod: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'bracket' },
      eoscEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      eoscBase: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'last_wage' },
      negativeLeaveAllowed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

      // ─── Base columns ───────────────────────────────────────────────────
      createdBy: { type: DataTypes.UUID, allowNull: true },
      updatedBy: { type: DataTypes.UUID, allowNull: true },
      createdAt: {
        type: 'TIMESTAMPTZ' as any,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: 'TIMESTAMPTZ' as any,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      deletedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize
    .getQueryInterface()
    .dropTable({ tableName: 'company_settings', schema: 'public' });
}
