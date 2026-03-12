/**
 * 07 — Report Data Seeder
 *
 * Seeds tenants and subscriptions with varied statuses, plans, and dates
 * to produce meaningful data for backoffice Revenue Reports and Subscription Analytics.
 *
 * Prerequisites: 01-plans.seed.ts must have been run first.
 * Idempotent: checks existence before inserting.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/database/sql/seeders/07-report-data.seed.ts
 */

import { Sequelize } from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USERNAME = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASS || 'postgres';
const DB_DATABASE = process.env.DB_NAME || 'erp_core';

// ── Helpers ──────────────────────────────────────────────────────────────────

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Seed Tenant Definitions ─────────────────────────────────────────────────

interface SeedTenant {
  slug: string;
  nameEn: string;
  nameAr: string;
  status: 'active' | 'trial' | 'suspended';
  planSlug: string;
  subStatus: 'active' | 'trial' | 'cancelled' | 'expired' | 'past_due';
  createdMonthsAgo: number;
}

const SEED_TENANTS: SeedTenant[] = [
  // ── Active Enterprise tenants (high revenue) ──
  {
    slug: 'acme-corp',
    nameEn: 'Acme Corporation',
    nameAr: 'شركة أكمي',
    status: 'active',
    planSlug: 'enterprise',
    subStatus: 'active',
    createdMonthsAgo: 18,
  },
  {
    slug: 'gulf-trading',
    nameEn: 'Gulf Trading Co.',
    nameAr: 'شركة الخليج للتجارة',
    status: 'active',
    planSlug: 'enterprise',
    subStatus: 'active',
    createdMonthsAgo: 14,
  },
  {
    slug: 'noor-tech',
    nameEn: 'Noor Technologies',
    nameAr: 'تقنيات نور',
    status: 'active',
    planSlug: 'enterprise',
    subStatus: 'active',
    createdMonthsAgo: 10,
  },

  // ── Active Business tenants ──
  {
    slug: 'sahara-logistics',
    nameEn: 'Sahara Logistics',
    nameAr: 'لوجستيات الصحراء',
    status: 'active',
    planSlug: 'business',
    subStatus: 'active',
    createdMonthsAgo: 16,
  },
  {
    slug: 'madinah-foods',
    nameEn: 'Madinah Foods',
    nameAr: 'أطعمة المدينة',
    status: 'active',
    planSlug: 'business',
    subStatus: 'active',
    createdMonthsAgo: 13,
  },
  {
    slug: 'riyadh-motors',
    nameEn: 'Riyadh Motors',
    nameAr: 'موتورز الرياض',
    status: 'active',
    planSlug: 'business',
    subStatus: 'active',
    createdMonthsAgo: 11,
  },
  {
    slug: 'atlas-retail',
    nameEn: 'Atlas Retail',
    nameAr: 'أطلس للتجزئة',
    status: 'active',
    planSlug: 'business',
    subStatus: 'active',
    createdMonthsAgo: 8,
  },
  {
    slug: 'cedar-consulting',
    nameEn: 'Cedar Consulting',
    nameAr: 'سيدار للاستشارات',
    status: 'active',
    planSlug: 'business',
    subStatus: 'active',
    createdMonthsAgo: 6,
  },

  // ── Active Growth tenants ──
  {
    slug: 'bloom-cafe',
    nameEn: 'Bloom Café',
    nameAr: 'مقهى بلوم',
    status: 'active',
    planSlug: 'growth',
    subStatus: 'active',
    createdMonthsAgo: 12,
  },
  {
    slug: 'pixel-studio',
    nameEn: 'Pixel Studio',
    nameAr: 'استوديو بكسل',
    status: 'active',
    planSlug: 'growth',
    subStatus: 'active',
    createdMonthsAgo: 9,
  },
  {
    slug: 'jeddah-clinic',
    nameEn: 'Jeddah Health Clinic',
    nameAr: 'عيادة جدة الصحية',
    status: 'active',
    planSlug: 'growth',
    subStatus: 'active',
    createdMonthsAgo: 7,
  },
  {
    slug: 'wave-fitness',
    nameEn: 'Wave Fitness',
    nameAr: 'ويف فتنس',
    status: 'active',
    planSlug: 'growth',
    subStatus: 'active',
    createdMonthsAgo: 5,
  },
  {
    slug: 'dammam-print',
    nameEn: 'Dammam Print House',
    nameAr: 'مطبعة الدمام',
    status: 'active',
    planSlug: 'growth',
    subStatus: 'active',
    createdMonthsAgo: 3,
  },

  // ── Active Starter tenants ──
  {
    slug: 'tiny-shop',
    nameEn: 'Tiny Shop',
    nameAr: 'المتجر الصغير',
    status: 'active',
    planSlug: 'starter',
    subStatus: 'active',
    createdMonthsAgo: 15,
  },
  {
    slug: 'handy-crafts',
    nameEn: 'Handy Crafts',
    nameAr: 'حرف يدوية',
    status: 'active',
    planSlug: 'starter',
    subStatus: 'active',
    createdMonthsAgo: 10,
  },
  {
    slug: 'fresh-juice',
    nameEn: 'Fresh Juice Bar',
    nameAr: 'بار العصائر الطازجة',
    status: 'active',
    planSlug: 'starter',
    subStatus: 'active',
    createdMonthsAgo: 4,
  },

  // ── Trial tenants ──
  {
    slug: 'trial-alpha',
    nameEn: 'Alpha Innovations',
    nameAr: 'ألفا للابتكار',
    status: 'trial',
    planSlug: 'growth',
    subStatus: 'trial',
    createdMonthsAgo: 0,
  },
  {
    slug: 'trial-beta',
    nameEn: 'Beta Solutions',
    nameAr: 'بيتا للحلول',
    status: 'trial',
    planSlug: 'business',
    subStatus: 'trial',
    createdMonthsAgo: 0,
  },
  {
    slug: 'trial-gamma',
    nameEn: 'Gamma Designs',
    nameAr: 'جاما للتصاميم',
    status: 'trial',
    planSlug: 'growth',
    subStatus: 'trial',
    createdMonthsAgo: 0,
  },

  // ── Cancelled tenants ──
  {
    slug: 'old-market',
    nameEn: 'Old Market Store',
    nameAr: 'متجر السوق القديم',
    status: 'active',
    planSlug: 'growth',
    subStatus: 'cancelled',
    createdMonthsAgo: 20,
  },
  {
    slug: 'sunset-travel',
    nameEn: 'Sunset Travel',
    nameAr: 'غروب للسفر',
    status: 'active',
    planSlug: 'business',
    subStatus: 'cancelled',
    createdMonthsAgo: 15,
  },

  // ── Expired tenants ──
  {
    slug: 'legacy-systems',
    nameEn: 'Legacy Systems',
    nameAr: 'أنظمة ليجاسي',
    status: 'active',
    planSlug: 'starter',
    subStatus: 'expired',
    createdMonthsAgo: 22,
  },
  {
    slug: 'temp-agency',
    nameEn: 'Temp Agency',
    nameAr: 'وكالة مؤقتة',
    status: 'active',
    planSlug: 'growth',
    subStatus: 'expired',
    createdMonthsAgo: 18,
  },

  // ── Past due tenants ──
  {
    slug: 'slow-pay',
    nameEn: 'Slow Pay Ltd.',
    nameAr: 'شركة الدفع البطيء',
    status: 'active',
    planSlug: 'business',
    subStatus: 'past_due',
    createdMonthsAgo: 9,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SEED
// ══════════════════════════════════════════════════════════════════════════════

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

    // ── Load plan IDs ────────────────────────────────────────────────────────
    const [planRows] = await sequelize.query(`SELECT id, slug, monthly_price FROM public.plans`);
    const plans = planRows as { id: string; slug: string; monthly_price: string }[];
    const planMap = new Map(
      plans.map((p) => [p.slug, { id: p.id, price: parseFloat(p.monthly_price) }]),
    );

    if (planMap.size === 0) {
      console.error('No plans found. Run 01-plans.seed.ts first.');
      process.exit(1);
    }

    console.log(`Loaded ${planMap.size} plans: ${[...planMap.keys()].join(', ')}\n`);

    let created = 0;
    let skipped = 0;

    for (const t of SEED_TENANTS) {
      // Check if tenant already exists
      const [existing] = await sequelize.query(
        `SELECT id FROM public.tenants WHERE slug = :slug AND deleted_at IS NULL`,
        { replacements: { slug: t.slug } },
      );

      if ((existing as any[]).length > 0) {
        skipped++;
        continue;
      }

      const plan = planMap.get(t.planSlug);
      if (!plan) {
        console.warn(`  Plan '${t.planSlug}' not found for tenant '${t.slug}', skipping.`);
        skipped++;
        continue;
      }

      const tenantId = uuidv7();
      const createdAt = monthsAgo(t.createdMonthsAgo);

      // Insert tenant
      await sequelize.query(
        `INSERT INTO public.tenants (id, name, slug, status, settings, features, created_at, updated_at)
         VALUES (:id, :name::jsonb, :slug, :status,
                 '{"logo": null}'::jsonb,
                 '{"hr": true, "inventory": true, "crm": true, "purchasing": true, "projects": true, "reporting": true}'::jsonb,
                 :createdAt, :createdAt)`,
        {
          replacements: {
            id: tenantId,
            name: JSON.stringify({ en: t.nameEn, ar: t.nameAr }),
            slug: t.slug,
            status: t.status,
            createdAt,
          },
        },
      );

      // Compute subscription dates
      const periodStart = new Date(createdAt);
      const periodEnd = new Date(createdAt);
      periodEnd.setMonth(periodEnd.getMonth() + (t.subStatus === 'trial' ? 1 : 12));

      const cancelledAt =
        t.subStatus === 'cancelled'
          ? daysAgo(randomBetween(10, 60))
          : t.subStatus === 'expired'
            ? daysAgo(randomBetween(30, 90))
            : null;

      // Insert subscription
      await sequelize.query(
        `INSERT INTO public.subscriptions
         (id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end,
          auto_renewal, cancelled_at, created_at, updated_at)
         VALUES (:id, :tenantId, :planId, :status, :billingCycle, :periodStart, :periodEnd,
                 :autoRenewal, :cancelledAt, :createdAt, :updatedAt)`,
        {
          replacements: {
            id: uuidv7(),
            tenantId,
            planId: plan.id,
            status: t.subStatus,
            billingCycle:
              t.subStatus === 'trial' ? 'monthly' : Math.random() > 0.4 ? 'annual' : 'monthly',
            periodStart,
            periodEnd,
            autoRenewal: t.subStatus === 'active',
            cancelledAt,
            createdAt,
            updatedAt: cancelledAt ?? createdAt,
          },
        },
      );

      created++;
      console.log(`  Created: ${t.slug} (${t.planSlug}, ${t.subStatus})`);
    }

    console.log(`\n--- Report Data Seed Complete ---`);
    console.log(`  Created: ${created}  |  Skipped (already exist): ${skipped}`);
  } catch (error) {
    console.error('Report data seed failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
