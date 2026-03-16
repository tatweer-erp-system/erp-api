import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

/**
 * Creates all definition/lookup tables for Settings & Definitions feature:
 *
 * HR:           job_titles, employment_types, leave_types_config, public_holidays, termination_reasons
 * Inventory:    units_of_measure, adjustment_reasons
 * Sales & POS:  voucher_types, receipt_templates, cancellation_reasons, void_refund_reasons, discount_reasons, hold_reasons
 * Purchases:    payment_terms, rejection_reasons
 * Treasury:     transfer_reasons
 * Auth/User:    user_preferences, user_branches
 */
export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── Shared column helpers ───────────────────────────────────────────────────
  const baseColumns = {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
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
  };

  const bilingualName = {
    nameEn: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), allowNull: false },
  };

  const bilingualDesc = {
    descriptionEn: { type: DataTypes.STRING(500), allowNull: true },
    descriptionAr: { type: DataTypes.STRING(500), allowNull: true },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HR DEFINITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. job_titles
  await qi.createTable('job_titles', {
    ...baseColumns,
    ...bilingualName,
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'departments', key: 'id' },
      onDelete: 'SET NULL',
    },
    grade: { type: DataTypes.STRING(50), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('job_titles', ['tenantId']);
  await qi.addIndex('job_titles', ['tenantId', 'departmentId']);

  // 2. employment_types
  await qi.createTable('employment_types', {
    ...baseColumns,
    ...bilingualName,
    ...bilingualDesc,
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('employment_types', ['tenantId']);

  // 3. leave_types_config
  await qi.createTable('leave_types_config', {
    ...baseColumns,
    ...bilingualName,
    ...bilingualDesc,
    daysPerYear: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isPaid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    requiresApproval: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('leave_types_config', ['tenantId']);

  // 4. public_holidays
  await qi.createTable('public_holidays', {
    ...baseColumns,
    ...bilingualName,
    date: { type: DataTypes.DATEONLY, allowNull: false },
    isRecurring: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('public_holidays', ['tenantId']);
  await qi.addIndex('public_holidays', ['tenantId', 'date']);

  // 5. termination_reasons
  await qi.createTable('termination_reasons', {
    ...baseColumns,
    ...bilingualName,
    type: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'voluntary' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('termination_reasons', ['tenantId']);

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTORY DEFINITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // 6. units_of_measure
  await qi.createTable('units_of_measure', {
    ...baseColumns,
    ...bilingualName,
    symbol: { type: DataTypes.STRING(20), allowNull: false },
    uomType: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'unit' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('units_of_measure', ['tenantId']);

  // 7. adjustment_reasons
  await qi.createTable('adjustment_reasons', {
    ...baseColumns,
    ...bilingualName,
    type: { type: DataTypes.STRING(50), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('adjustment_reasons', ['tenantId']);

  // ═══════════════════════════════════════════════════════════════════════════
  // SALES & POS DEFINITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // 8. voucher_types
  await qi.createTable('voucher_types', {
    ...baseColumns,
    ...bilingualName,
    ...bilingualDesc,
    discountType: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'percentage' },
    discountValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    minOrderAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    validDays: { type: DataTypes.INTEGER, allowNull: true },
    maxUses: { type: DataTypes.INTEGER, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('voucher_types', ['tenantId']);

  // 9. receipt_templates
  await qi.createTable('receipt_templates', {
    ...baseColumns,
    ...bilingualName,
    headerTextEn: { type: DataTypes.TEXT, allowNull: true },
    headerTextAr: { type: DataTypes.TEXT, allowNull: true },
    footerTextEn: { type: DataTypes.TEXT, allowNull: true },
    footerTextAr: { type: DataTypes.TEXT, allowNull: true },
    showLogo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    showTaxDetails: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    showBarcode: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    copies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('receipt_templates', ['tenantId']);

  // 10. cancellation_reasons
  await qi.createTable('cancellation_reasons', {
    ...baseColumns,
    ...bilingualName,
    requiresApproval: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('cancellation_reasons', ['tenantId']);

  // 11. void_refund_reasons
  await qi.createTable('void_refund_reasons', {
    ...baseColumns,
    ...bilingualName,
    type: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'both' },
    requiresManager: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('void_refund_reasons', ['tenantId']);

  // 12. discount_reasons
  await qi.createTable('discount_reasons', {
    ...baseColumns,
    ...bilingualName,
    maxPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    requiresApproval: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('discount_reasons', ['tenantId']);

  // 13. hold_reasons
  await qi.createTable('hold_reasons', {
    ...baseColumns,
    ...bilingualName,
    maxHoldMinutes: { type: DataTypes.INTEGER, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('hold_reasons', ['tenantId']);

  // ═══════════════════════════════════════════════════════════════════════════
  // PURCHASES DEFINITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // 14. payment_terms
  await qi.createTable('payment_terms', {
    ...baseColumns,
    ...bilingualName,
    ...bilingualDesc,
    daysDue: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
    penaltyPercentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('payment_terms', ['tenantId']);

  // 15. rejection_reasons
  await qi.createTable('rejection_reasons', {
    ...baseColumns,
    ...bilingualName,
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('rejection_reasons', ['tenantId']);

  // ═══════════════════════════════════════════════════════════════════════════
  // TREASURY DEFINITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // 16. transfer_reasons
  await qi.createTable('transfer_reasons', {
    ...baseColumns,
    ...bilingualName,
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await qi.addIndex('transfer_reasons', ['tenantId']);

  // ═══════════════════════════════════════════════════════════════════════════
  // USER / AUTH
  // ═══════════════════════════════════════════════════════════════════════════

  // 17. user_preferences
  await qi.createTable('user_preferences', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    key: { type: DataTypes.STRING(100), allowNull: false },
    value: { type: DataTypes.TEXT, allowNull: true },
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
  });
  await qi.addIndex('user_preferences', ['userId', 'key'], { unique: true });

  // 18. user_branches
  await qi.createTable('user_branches', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'branches', key: 'id' },
      onDelete: 'CASCADE',
    },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
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
  });
  await qi.addIndex('user_branches', ['tenantId', 'userId', 'branchId'], { unique: true });
  await qi.addIndex('user_branches', ['userId']);
  await qi.addIndex('user_branches', ['branchId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // Drop in reverse order
  await qi.dropTable('user_branches');
  await qi.dropTable('user_preferences');
  await qi.dropTable('transfer_reasons');
  await qi.dropTable('rejection_reasons');
  await qi.dropTable('payment_terms');
  await qi.dropTable('hold_reasons');
  await qi.dropTable('discount_reasons');
  await qi.dropTable('void_refund_reasons');
  await qi.dropTable('cancellation_reasons');
  await qi.dropTable('receipt_templates');
  await qi.dropTable('voucher_types');
  await qi.dropTable('adjustment_reasons');
  await qi.dropTable('units_of_measure');
  await qi.dropTable('termination_reasons');
  await qi.dropTable('public_holidays');
  await qi.dropTable('leave_types_config');
  await qi.dropTable('employment_types');
  await qi.dropTable('job_titles');
}
