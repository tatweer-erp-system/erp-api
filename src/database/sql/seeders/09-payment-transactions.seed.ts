/**
 * 09 — Payment Transactions Seeder
 *
 * Seeds payment_transactions for existing subscriptions to generate
 * realistic revenue data for the backoffice Revenue Reports.
 *
 * Prerequisites: 07-report-data.seed.ts must have been run first.
 * Idempotent: skips tenants that already have payment transactions.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/database/sql/seeders/09-payment-transactions.seed.ts
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

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

    // Load subscriptions with their tenants and plans
    const [subscriptions] = await sequelize.query(`
      SELECT s.id as sub_id, s.tenant_id, s.status as sub_status,
             s.billing_cycle, s.created_at as sub_created,
             p.monthly_price, p.annual_price, p.slug as plan_slug,
             t.slug as tenant_slug
      FROM public.subscriptions s
      JOIN public.plans p ON p.id = s.plan_id
      JOIN public.tenants t ON t.id = s.tenant_id
      WHERE s.deleted_at IS NULL AND t.deleted_at IS NULL
    `);

    if ((subscriptions as any[]).length === 0) {
      console.error('No subscriptions found. Run 07-report-data.seed.ts first.');
      process.exit(1);
    }

    console.log(`Found ${(subscriptions as any[]).length} subscriptions.\n`);

    let created = 0;
    let skipped = 0;
    const providers = ['stripe', 'moyasar', 'tap'];

    for (const sub of subscriptions as any[]) {
      // Check if transactions already exist for this subscription
      const [existing] = await sequelize.query(
        `SELECT COUNT(*)::int as cnt FROM public.payment_transactions WHERE subscription_id = :subId`,
        { replacements: { subId: sub.sub_id } },
      );

      if ((existing as any[])[0]?.cnt > 0) {
        skipped++;
        continue;
      }

      const monthlyPrice = parseFloat(sub.monthly_price || '0');
      const annualPrice = parseFloat(sub.annual_price || '0');
      const isAnnual = sub.billing_cycle === 'annual';
      const amount = isAnnual ? annualPrice : monthlyPrice;

      // Skip free plans (starter)
      if (amount === 0) {
        skipped++;
        continue;
      }

      const subCreated = new Date(sub.sub_created);
      const monthsSinceCreation = Math.max(
        1,
        Math.floor((Date.now() - subCreated.getTime()) / (30 * 24 * 60 * 60 * 1000)),
      );

      // Generate payment transactions — one per billing period
      const numPayments = isAnnual ? Math.ceil(monthsSinceCreation / 12) : monthsSinceCreation;

      for (let i = 0; i < Math.min(numPayments, 24); i++) {
        const paymentDate = isAnnual
          ? monthsAgo(Math.max(0, monthsSinceCreation - i * 12))
          : monthsAgo(Math.max(0, monthsSinceCreation - i));

        // Determine status based on subscription status and timing
        let status: string;
        if (sub.sub_status === 'cancelled' || sub.sub_status === 'expired') {
          status = i === 0 ? 'failed' : 'paid';
        } else if (sub.sub_status === 'past_due' && i === 0) {
          status = 'failed';
        } else {
          status = 'paid';
        }

        const provider = providers[randomBetween(0, providers.length - 1)];

        await sequelize.query(
          `INSERT INTO public.payment_transactions
           (id, subscription_id, tenant_id, amount, currency, status, provider,
            provider_transaction_id, created_at, updated_at)
           VALUES (:id, :subId, :tenantId, :amount, 'SAR', :status, :provider,
                   :providerTxnId, :createdAt, :updatedAt)`,
          {
            replacements: {
              id: uuidv7(),
              subId: sub.sub_id,
              tenantId: sub.tenant_id,
              amount,
              status,
              provider,
              providerTxnId: status === 'paid' ? `txn_${uuidv7().slice(0, 12)}` : null,
              createdAt: paymentDate,
              updatedAt: paymentDate,
            },
          },
        );

        created++;
      }

      console.log(
        `  ${sub.tenant_slug}: ${Math.min(numPayments, 24)} transactions (${sub.plan_slug}, ${isAnnual ? 'annual' : 'monthly'})`,
      );
    }

    console.log(`\n--- Payment Transactions Seed Complete ---`);
    console.log(`  Created: ${created}  |  Skipped: ${skipped}`);
  } catch (error) {
    console.error('Payment transactions seed failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
