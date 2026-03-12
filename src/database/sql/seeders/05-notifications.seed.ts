/**
 * 05 — Notifications Seeder
 *
 * Seeds sample notifications for the demo tenant's admin user.
 * Covers all notification modules: Tenants, Subscriptions, Plans, Support, Renewals, System.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/database/sql/seeders/05-notifications.seed.ts
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

interface NotificationSeed {
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  hoursAgo: number; // how many hours ago the notification was created
}

const NOTIFICATIONS: NotificationSeed[] = [
  // ── Tenant notifications ──────────────────────────────────────────────────
  {
    type: 'tenant.created',
    title: 'New tenant registered',
    body: 'Al-Noor Trading Co. has registered and started a 14-day free trial.',
    data: { tenantSlug: 'al-noor-trading', tenantName: 'Al-Noor Trading Co.' },
    isRead: false,
    hoursAgo: 1,
  },
  {
    type: 'tenant.suspended',
    title: 'Tenant suspended',
    body: 'Gulf Solutions Ltd. has been suspended due to payment failure after 3 retries.',
    data: { tenantSlug: 'gulf-solutions', reason: 'payment_failure' },
    isRead: false,
    hoursAgo: 3,
  },
  {
    type: 'tenant.activated',
    title: 'Tenant activated',
    body: 'Saudi Tech Industries has been activated successfully after completing payment.',
    data: { tenantSlug: 'saudi-tech' },
    isRead: true,
    hoursAgo: 24,
  },

  // ── Subscription notifications ────────────────────────────────────────────
  {
    type: 'subscription.expiring',
    title: 'Subscription expiring soon',
    body: 'Demo Company subscription expires in 7 days. Auto-renewal is enabled.',
    data: { tenantSlug: 'demo', daysLeft: 7, autoRenewal: true },
    isRead: false,
    hoursAgo: 2,
  },
  {
    type: 'subscription.payment_success',
    title: 'Payment received',
    body: 'Payment of 2,988 SAR received from Al-Baraka Group for annual Business plan renewal.',
    data: { tenantSlug: 'al-baraka', amount: 2988, currency: 'SAR', planSlug: 'business' },
    isRead: false,
    hoursAgo: 5,
  },
  {
    type: 'subscription.payment_failed',
    title: 'Payment failed',
    body: 'Payment attempt for Riyadh Electronics failed. Card ending in 4532 was declined.',
    data: { tenantSlug: 'riyadh-electronics', cardLast4: '4532', reason: 'card_declined' },
    isRead: false,
    hoursAgo: 6,
  },
  {
    type: 'subscription.upgraded',
    title: 'Plan upgraded',
    body: 'Jeddah Logistics upgraded from Starter to Professional plan (annual billing).',
    data: { tenantSlug: 'jeddah-logistics', fromPlan: 'starter', toPlan: 'professional' },
    isRead: true,
    hoursAgo: 48,
  },

  // ── Plan notifications ────────────────────────────────────────────────────
  {
    type: 'plan.updated',
    title: 'Plan pricing updated',
    body: 'Enterprise plan monthly price changed from 499 SAR to 549 SAR.',
    data: { planSlug: 'enterprise', oldPrice: 499, newPrice: 549 },
    isRead: true,
    hoursAgo: 72,
  },

  // ── Support notifications ─────────────────────────────────────────────────
  {
    type: 'support.ticket_created',
    title: 'New support ticket',
    body: 'High priority ticket from Demo Company: "Cannot generate sales reports for Q4".',
    data: { tenantSlug: 'demo', priority: 'high', subject: 'Cannot generate sales reports for Q4' },
    isRead: false,
    hoursAgo: 4,
  },
  {
    type: 'support.ticket_escalated',
    title: 'Ticket escalated',
    body: 'Ticket #TK-2026-089 has been escalated to critical priority. Customer: Al-Noor Trading.',
    data: { ticketNumber: 'TK-2026-089', tenantSlug: 'al-noor-trading', newPriority: 'critical' },
    isRead: false,
    hoursAgo: 8,
  },
  {
    type: 'support.ticket_resolved',
    title: 'Ticket resolved',
    body: 'Ticket #TK-2026-075 has been resolved. Customer: Saudi Tech Industries.',
    data: { ticketNumber: 'TK-2026-075', tenantSlug: 'saudi-tech' },
    isRead: true,
    hoursAgo: 36,
  },

  // ── Renewal notifications ─────────────────────────────────────────────────
  {
    type: 'renewal.upcoming',
    title: '5 subscriptions renewing this week',
    body: 'There are 5 subscriptions scheduled for renewal in the next 7 days. 3 have auto-renewal enabled.',
    data: { totalRenewals: 5, autoRenewalCount: 3, manualCount: 2 },
    isRead: false,
    hoursAgo: 12,
  },
  {
    type: 'renewal.overdue',
    title: 'Overdue renewal',
    body: 'Gulf Solutions subscription is 5 days overdue. Current status: past_due.',
    data: { tenantSlug: 'gulf-solutions', daysOverdue: 5, status: 'past_due' },
    isRead: false,
    hoursAgo: 10,
  },

  // ── System notifications ──────────────────────────────────────────────────
  {
    type: 'system.maintenance',
    title: 'Scheduled maintenance',
    body: 'System maintenance scheduled for March 15, 2026 from 02:00 to 04:00 AST. Brief downtime expected.',
    data: { scheduledDate: '2026-03-15', startTime: '02:00', endTime: '04:00', timezone: 'AST' },
    isRead: false,
    hoursAgo: 16,
  },
  {
    type: 'system.backup_completed',
    title: 'Backup completed',
    body: 'Daily database backup completed successfully. Size: 2.4 GB. Duration: 12 minutes.',
    data: { sizeGB: 2.4, durationMinutes: 12 },
    isRead: true,
    hoursAgo: 20,
  },
  {
    type: 'system.security_alert',
    title: 'Security alert',
    body: 'Multiple failed login attempts detected from IP 185.234.xx.xx for tenant al-noor-trading. Account temporarily locked.',
    data: { ip: '185.234.xx.xx', tenantSlug: 'al-noor-trading', attempts: 8 },
    isRead: false,
    hoursAgo: 7,
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

    // ── Find demo tenant and admin user ─────────────────────────────────────
    const [tenants] = await sequelize.query(
      `SELECT id FROM public.tenants WHERE slug = 'demo' AND deleted_at IS NULL`,
    );

    if ((tenants as any[]).length === 0) {
      console.error('Demo tenant not found. Run 04-demo-tenant.seed.ts first.');
      process.exit(1);
    }
    const tenantId = (tenants as any[])[0].id;
    console.log(`Demo tenant ID: ${tenantId}`);

    const [users] = await sequelize.query(
      `SELECT id FROM public.users WHERE email = 'admin@demo.com' AND tenant_id = :tenantId AND deleted_at IS NULL`,
      { replacements: { tenantId } },
    );

    if ((users as any[]).length === 0) {
      console.error('Admin user not found. Run 04-demo-tenant.seed.ts first.');
      process.exit(1);
    }
    const userId = (users as any[])[0].id;
    console.log(`Admin user ID: ${userId}\n`);

    // ── Check existing notifications ────────────────────────────────────────
    const [existing] = await sequelize.query(
      `SELECT COUNT(*)::int AS count FROM public.notifications WHERE tenant_id = :tenantId AND user_id = :userId AND deleted_at IS NULL`,
      { replacements: { tenantId, userId } },
    );
    const existingCount = (existing as any[])[0]?.count ?? 0;

    if (existingCount > 0) {
      console.log(`${existingCount} notifications already exist for this user. Skipping seed.`);
      console.log('To re-seed, delete existing notifications first:');
      console.log(
        `  DELETE FROM public.notifications WHERE tenant_id = '${tenantId}' AND user_id = '${userId}';`,
      );
      return;
    }

    // ── Insert notifications ────────────────────────────────────────────────
    console.log('=== Seeding Notifications ===\n');

    let created = 0;
    for (const notif of NOTIFICATIONS) {
      const id = uuidv7();
      const createdAt = new Date(Date.now() - notif.hoursAgo * 3600000);
      const readAt = notif.isRead ? new Date(createdAt.getTime() + 1800000) : null; // 30 min after creation

      await sequelize.query(
        `INSERT INTO public.notifications
         (id, tenant_id, user_id, type, title, body, data, is_read, read_at, version, created_at, updated_at)
         VALUES (:id, :tenantId, :userId, :type, :title, :body, :data, :isRead, :readAt, 0, :createdAt, :createdAt)`,
        {
          replacements: {
            id,
            tenantId,
            userId,
            type: notif.type,
            title: notif.title,
            body: notif.body,
            data: JSON.stringify(notif.data),
            isRead: notif.isRead,
            readAt,
            createdAt,
          },
        } as any,
      );

      const readLabel = notif.isRead ? '(read)' : '(unread)';
      console.log(`  [${notif.type}] ${notif.title} ${readLabel}`);
      created++;
    }

    // ════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n' + '='.repeat(50));
    console.log('Notification Seed Complete!');
    console.log('='.repeat(50));
    console.log(`Total created:   ${created}`);
    console.log(`Unread:          ${NOTIFICATIONS.filter((n) => !n.isRead).length}`);
    console.log(`Read:            ${NOTIFICATIONS.filter((n) => n.isRead).length}`);
    console.log(`User:            admin@demo.com`);
    console.log(`Tenant:          demo`);
  } catch (error) {
    console.error('Notification seed failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
