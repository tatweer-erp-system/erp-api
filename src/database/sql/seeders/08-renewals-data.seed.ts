/**
 * 08 — Renewals Data Seeder
 *
 * Updates existing subscriptions to create realistic renewal scenarios:
 * - Upcoming renewals: subscriptions expiring within 1-30 days
 * - Overdue: subscriptions marked as past_due
 * - Recently processed: active subscriptions with recent updatedAt
 *
 * Prerequisites: 07-report-data.seed.ts must have been run first.
 * Safe to re-run: updates existing records by tenant slug.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/database/sql/seeders/08-renewals-data.seed.ts
 */

import { Sequelize } from 'sequelize-typescript';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USERNAME = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASS || 'postgres';
const DB_DATABASE = process.env.DB_NAME || 'erp_core';

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  return daysFromNow(-n);
}

// Each entry updates a subscription by matching its tenant slug
interface RenewalUpdate {
  tenantSlug: string;
  status: 'active' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  autoRenewal: boolean;
  cancelledAt: Date | null;
  updatedAt: Date;
}

const now = new Date();

const RENEWAL_UPDATES: RenewalUpdate[] = [
  // ── Upcoming renewals (expiring within 1-30 days) ──────────────────────────

  // Expiring in 3 days — urgent
  {
    tenantSlug: 'acme-corp',
    status: 'active',
    currentPeriodStart: daysAgo(362),
    currentPeriodEnd: daysFromNow(3),
    autoRenewal: true,
    cancelledAt: null,
    updatedAt: daysAgo(362),
  },
  // Expiring in 5 days
  {
    tenantSlug: 'sahara-logistics',
    status: 'active',
    currentPeriodStart: daysAgo(25),
    currentPeriodEnd: daysFromNow(5),
    autoRenewal: true,
    cancelledAt: null,
    updatedAt: daysAgo(25),
  },
  // Expiring in 7 days — approaching deadline
  {
    tenantSlug: 'bloom-cafe',
    status: 'active',
    currentPeriodStart: daysAgo(23),
    currentPeriodEnd: daysFromNow(7),
    autoRenewal: false,
    cancelledAt: null,
    updatedAt: daysAgo(23),
  },
  // Expiring in 10 days
  {
    tenantSlug: 'riyadh-motors',
    status: 'active',
    currentPeriodStart: daysAgo(355),
    currentPeriodEnd: daysFromNow(10),
    autoRenewal: true,
    cancelledAt: null,
    updatedAt: daysAgo(355),
  },
  // Expiring in 14 days
  {
    tenantSlug: 'pixel-studio',
    status: 'active',
    currentPeriodStart: daysAgo(16),
    currentPeriodEnd: daysFromNow(14),
    autoRenewal: true,
    cancelledAt: null,
    updatedAt: daysAgo(16),
  },
  // Expiring in 18 days
  {
    tenantSlug: 'jeddah-clinic',
    status: 'active',
    currentPeriodStart: daysAgo(12),
    currentPeriodEnd: daysFromNow(18),
    autoRenewal: false,
    cancelledAt: null,
    updatedAt: daysAgo(12),
  },
  // Expiring in 25 days
  {
    tenantSlug: 'atlas-retail',
    status: 'active',
    currentPeriodStart: daysAgo(340),
    currentPeriodEnd: daysFromNow(25),
    autoRenewal: true,
    cancelledAt: null,
    updatedAt: daysAgo(340),
  },
  // Expiring in 28 days
  {
    tenantSlug: 'wave-fitness',
    status: 'active',
    currentPeriodStart: daysAgo(2),
    currentPeriodEnd: daysFromNow(28),
    autoRenewal: true,
    cancelledAt: null,
    updatedAt: daysAgo(2),
  },

  // ── Overdue / Past Due ─────────────────────────────────────────────────────

  // Overdue by 5 days
  {
    tenantSlug: 'slow-pay',
    status: 'past_due',
    currentPeriodStart: daysAgo(35),
    currentPeriodEnd: daysAgo(5),
    autoRenewal: false,
    cancelledAt: null,
    updatedAt: daysAgo(5),
  },
  // Overdue by 12 days
  {
    tenantSlug: 'old-market',
    status: 'past_due',
    currentPeriodStart: daysAgo(42),
    currentPeriodEnd: daysAgo(12),
    autoRenewal: false,
    cancelledAt: null,
    updatedAt: daysAgo(12),
  },
  // Overdue by 3 days
  {
    tenantSlug: 'dammam-print',
    status: 'past_due',
    currentPeriodStart: daysAgo(33),
    currentPeriodEnd: daysAgo(3),
    autoRenewal: true,
    cancelledAt: null,
    updatedAt: daysAgo(3),
  },

  // ── Recently processed (renewed recently) ──────────────────────────────────

  // Renewed 2 days ago
  {
    tenantSlug: 'gulf-trading',
    status: 'active',
    currentPeriodStart: daysAgo(2),
    currentPeriodEnd: daysFromNow(363),
    autoRenewal: true,
    cancelledAt: null,
    updatedAt: daysAgo(2),
  },
  // Renewed 5 days ago
  {
    tenantSlug: 'noor-tech',
    status: 'active',
    currentPeriodStart: daysAgo(5),
    currentPeriodEnd: daysFromNow(360),
    autoRenewal: true,
    cancelledAt: null,
    updatedAt: daysAgo(5),
  },
  // Renewed 8 days ago
  {
    tenantSlug: 'madinah-foods',
    status: 'active',
    currentPeriodStart: daysAgo(8),
    currentPeriodEnd: daysFromNow(357),
    autoRenewal: true,
    cancelledAt: null,
    updatedAt: daysAgo(8),
  },
  // Renewed 15 days ago
  {
    tenantSlug: 'cedar-consulting',
    status: 'active',
    currentPeriodStart: daysAgo(15),
    currentPeriodEnd: daysFromNow(350),
    autoRenewal: true,
    cancelledAt: null,
    updatedAt: daysAgo(15),
  },
];

async function seed() {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log('Connected to database.\n');

    let updated = 0;
    let notFound = 0;

    for (const r of RENEWAL_UPDATES) {
      // Find the tenant
      const [tenantRows] = await sequelize.query(
        `SELECT id FROM public.tenants WHERE slug = :slug AND deleted_at IS NULL`,
        { replacements: { slug: r.tenantSlug } },
      );

      const tenant = (tenantRows as any[])[0];
      if (!tenant) {
        console.warn(`  Tenant '${r.tenantSlug}' not found, skipping.`);
        notFound++;
        continue;
      }

      // Update the subscription for this tenant
      const [result] = await sequelize.query(
        `UPDATE public.subscriptions
         SET status = :status,
             current_period_start = :periodStart,
             current_period_end = :periodEnd,
             auto_renewal = :autoRenewal,
             cancelled_at = :cancelledAt,
             updated_at = :updatedAt
         WHERE tenant_id = :tenantId`,
        {
          replacements: {
            tenantId: tenant.id,
            status: r.status,
            periodStart: r.currentPeriodStart,
            periodEnd: r.currentPeriodEnd,
            autoRenewal: r.autoRenewal,
            cancelledAt: r.cancelledAt,
            updatedAt: r.updatedAt,
          },
        },
      );

      updated++;
      const label =
        r.currentPeriodEnd > now
          ? r.currentPeriodEnd < daysFromNow(31)
            ? `upcoming (${Math.ceil((r.currentPeriodEnd.getTime() - now.getTime()) / 86400000)}d)`
            : `processed (renewed ${Math.ceil((now.getTime() - r.updatedAt.getTime()) / 86400000)}d ago)`
          : `overdue (${Math.ceil((now.getTime() - r.currentPeriodEnd.getTime()) / 86400000)}d)`;

      console.log(`  Updated: ${r.tenantSlug} → ${r.status} [${label}]`);
    }

    console.log(`\n--- Renewals Data Seed Complete ---`);
    console.log(`  Updated: ${updated}  |  Not found: ${notFound}`);
  } catch (error) {
    console.error('Renewals data seed failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
