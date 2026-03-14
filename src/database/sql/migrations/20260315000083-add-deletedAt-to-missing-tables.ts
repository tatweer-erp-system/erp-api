import { MigrationParams } from 'umzug';
import { Sequelize } from 'sequelize';

/**
 * All entities extend BaseEntity which defines a `deletedAt` column.
 * Many migrations omitted this column. This migration adds it to all
 * tables that are missing it, ensuring consistency with the entity layer.
 */
const TABLES_MISSING_DELETED_AT = [
  'api_keys',
  'attendance_records',
  'audit_logs',
  'bank_reconciliations',
  'consent_records',
  'erasure_requests',
  'exchange_rates',
  'fiscal_periods',
  'gift_card_transactions',
  'impersonation_logs',
  'journal_lines',
  'kitchen_tickets',
  'loyalty_accounts',
  'loyalty_tiers',
  'loyalty_transactions',
  'manager_overrides',
  'notification_preferences',
  'notification_templates',
  'outbox_events',
  'payment_transactions',
  'plans',
  'pos_held_orders',
  'pos_order_items',
  'pos_payments',
  'project_members',
  'purchase_order_lines',
  'refresh_tokens',
  'retention_logs',
  'rolePermissions',
  'sales_order_lines',
  'security_events',
  'sequences',
  'stock_levels',
  'stock_movements',
  'table_sessions',
  'tenant_metrics',
  'tenant_onboarding',
  'ticket_replies',
  'user_fcm_tokens',
  'user_roles',
  'voucher_redemptions',
];

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  for (const table of TABLES_MISSING_DELETED_AT) {
    // Check if column already exists (idempotent)
    const [cols] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = :table AND column_name = 'deletedAt'`,
      { replacements: { table } },
    );

    if ((cols as any[]).length === 0) {
      await sequelize.query(
        `ALTER TABLE public."${table}" ADD COLUMN "deletedAt" TIMESTAMPTZ NULL`,
      );
    }
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  for (const table of TABLES_MISSING_DELETED_AT) {
    const [cols] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = :table AND column_name = 'deletedAt'`,
      { replacements: { table } },
    );

    if ((cols as any[]).length > 0) {
      await sequelize.query(`ALTER TABLE public."${table}" DROP COLUMN "deletedAt"`);
    }
  }
}
