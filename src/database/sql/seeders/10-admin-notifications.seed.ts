/**
 * 10 — Admin Notifications Seeder
 *
 * Seeds realistic admin notifications for the superadmin account.
 * Covers all system event types: tenants, subscriptions, payments,
 * support tickets, renewals, and system alerts.
 * Idempotent: skips if notifications already exist for this admin.
 *
 * Prerequisites: 04-demo-tenant.seed.ts must have been run first.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/database/sql/seeders/10-admin-notifications.seed.ts
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

interface AdminNotificationSeed {
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  hoursAgo: number;
}

const ADMIN_NOTIFICATIONS: AdminNotificationSeed[] = [
  // ── Tenant events ─────────────────────────────────────────────────────────
  {
    type: 'tenant.registered',
    title: 'New tenant registered',
    body: 'Al-Noor Trading Co. has registered and started a 14-day free trial.',
    data: { tenantSlug: 'al-noor-trading', tenantName: 'Al-Noor Trading Co.', plan: 'starter' },
    isRead: false,
    hoursAgo: 1,
  },
  {
    type: 'tenant.registered',
    title: 'New tenant registered',
    body: 'Riyadh Electronics has registered and selected the Business plan.',
    data: { tenantSlug: 'riyadh-electronics', tenantName: 'Riyadh Electronics', plan: 'business' },
    isRead: false,
    hoursAgo: 5,
  },
  {
    type: 'tenant.suspended',
    title: 'Tenant suspended',
    body: 'Gulf Solutions Ltd. has been suspended due to payment failure after 3 retries.',
    data: {
      tenantSlug: 'gulf-solutions',
      tenantName: 'Gulf Solutions Ltd.',
      reason: 'payment_failure',
    },
    isRead: false,
    hoursAgo: 3,
  },
  {
    type: 'tenant.activated',
    title: 'Tenant activated',
    body: 'Saudi Tech Industries has been activated successfully after completing payment.',
    data: { tenantSlug: 'saudi-tech', tenantName: 'Saudi Tech Industries' },
    isRead: true,
    hoursAgo: 24,
  },
  {
    type: 'tenant.trial_expiring',
    title: 'Trial expiring soon',
    body: 'Madinah Foods trial expires in 2 days. They have not yet upgraded to a paid plan.',
    data: { tenantSlug: 'madinah-foods', tenantName: 'Madinah Foods', daysLeft: 2 },
    isRead: false,
    hoursAgo: 8,
  },

  // ── Subscription events ───────────────────────────────────────────────────
  {
    type: 'subscription.expiring',
    title: 'Subscription expiring soon',
    body: 'Acme Corp subscription expires in 3 days. Auto-renewal is enabled.',
    data: { tenantSlug: 'acme-corp', daysLeft: 3, autoRenewal: true, plan: 'enterprise' },
    isRead: false,
    hoursAgo: 2,
  },
  {
    type: 'subscription.expiring',
    title: 'Subscription expiring soon',
    body: 'Bloom Cafe subscription expires in 7 days. Auto-renewal is disabled.',
    data: { tenantSlug: 'bloom-cafe', daysLeft: 7, autoRenewal: false, plan: 'growth' },
    isRead: false,
    hoursAgo: 6,
  },
  {
    type: 'subscription.payment_success',
    title: 'Payment received',
    body: 'Payment of 6,990 SAR received from Atlas Retail for annual Business plan renewal.',
    data: {
      tenantSlug: 'atlas-retail',
      amount: 6990,
      currency: 'SAR',
      plan: 'business',
      billing: 'annual',
    },
    isRead: false,
    hoursAgo: 4,
  },
  {
    type: 'subscription.payment_success',
    title: 'Payment received',
    body: 'Payment of 299 SAR received from Noor Tech for monthly Growth plan.',
    data: {
      tenantSlug: 'noor-tech',
      amount: 299,
      currency: 'SAR',
      plan: 'growth',
      billing: 'monthly',
    },
    isRead: true,
    hoursAgo: 30,
  },
  {
    type: 'subscription.payment_failed',
    title: 'Payment failed',
    body: 'Payment attempt for Riyadh Motors failed. Card ending in 4532 was declined.',
    data: { tenantSlug: 'riyadh-motors', cardLast4: '4532', reason: 'card_declined', amount: 699 },
    isRead: false,
    hoursAgo: 6,
  },
  {
    type: 'subscription.payment_failed',
    title: 'Payment failed — 2nd attempt',
    body: 'Second payment attempt for Slow Pay Co. failed. Subscription is now past_due.',
    data: { tenantSlug: 'slow-pay', attempt: 2, reason: 'insufficient_funds', status: 'past_due' },
    isRead: false,
    hoursAgo: 10,
  },
  {
    type: 'subscription.upgraded',
    title: 'Plan upgraded',
    body: 'Jeddah Clinic upgraded from Starter to Business plan (annual billing).',
    data: {
      tenantSlug: 'jeddah-clinic',
      fromPlan: 'starter',
      toPlan: 'business',
      billing: 'annual',
    },
    isRead: true,
    hoursAgo: 48,
  },
  {
    type: 'subscription.cancelled',
    title: 'Subscription cancelled',
    body: 'Temp Agency has cancelled their subscription. Effective end of current period.',
    data: { tenantSlug: 'temp-agency', reason: 'too_expensive', effectiveDate: '2026-04-01' },
    isRead: true,
    hoursAgo: 72,
  },

  // ── Renewal events ────────────────────────────────────────────────────────
  {
    type: 'renewal.upcoming',
    title: '8 subscriptions renewing this month',
    body: 'There are 8 subscriptions scheduled for renewal in the next 30 days. 6 have auto-renewal enabled.',
    data: { totalRenewals: 8, autoRenewalCount: 6, manualCount: 2, totalValue: 28450 },
    isRead: false,
    hoursAgo: 12,
  },
  {
    type: 'renewal.overdue',
    title: 'Subscription overdue — 5 days',
    body: 'Slow Pay Co. subscription is 5 days overdue. Status: past_due. No payment method on file.',
    data: { tenantSlug: 'slow-pay', daysOverdue: 5, status: 'past_due' },
    isRead: false,
    hoursAgo: 9,
  },
  {
    type: 'renewal.overdue',
    title: 'Subscription overdue — 12 days',
    body: 'Old Market subscription is 12 days overdue. Consider suspending the account.',
    data: { tenantSlug: 'old-market', daysOverdue: 12, status: 'past_due' },
    isRead: false,
    hoursAgo: 11,
  },

  // ── Support events ────────────────────────────────────────────────────────
  {
    type: 'support.ticket_created',
    title: 'New support ticket — High priority',
    body: 'High priority ticket from Demo Company: "POS sessions not closing automatically after shift end".',
    data: {
      tenantSlug: 'demo',
      priority: 'high',
      subject: 'POS sessions not closing automatically after shift end',
      ticketId: 'TK-2026-101',
    },
    isRead: false,
    hoursAgo: 2,
  },
  {
    type: 'support.ticket_created',
    title: 'New support ticket — Critical',
    body: 'Critical ticket from Acme Corp: "Cannot process payments — all transactions failing".',
    data: {
      tenantSlug: 'acme-corp',
      priority: 'critical',
      subject: 'Cannot process payments — all transactions failing',
      ticketId: 'TK-2026-102',
    },
    isRead: false,
    hoursAgo: 1,
  },
  {
    type: 'support.ticket_escalated',
    title: 'Ticket escalated to critical',
    body: 'Ticket #TK-2026-089 escalated to critical. Customer: Al-Noor Trading. SLA breach in 2 hours.',
    data: {
      ticketId: 'TK-2026-089',
      tenantSlug: 'al-noor-trading',
      newPriority: 'critical',
      slaHoursLeft: 2,
    },
    isRead: false,
    hoursAgo: 7,
  },
  {
    type: 'support.ticket_resolved',
    title: 'Ticket resolved',
    body: 'Ticket #TK-2026-075 resolved. Customer: Saudi Tech Industries. Resolution time: 4 hours.',
    data: { ticketId: 'TK-2026-075', tenantSlug: 'saudi-tech', resolutionHours: 4 },
    isRead: true,
    hoursAgo: 36,
  },

  // ── System events ─────────────────────────────────────────────────────────
  {
    type: 'system.maintenance',
    title: 'Scheduled maintenance window',
    body: 'System maintenance scheduled for March 15, 2026 from 02:00 to 04:00 AST. Brief downtime expected.',
    data: { scheduledDate: '2026-03-15', startTime: '02:00', endTime: '04:00', timezone: 'AST' },
    isRead: false,
    hoursAgo: 16,
  },
  {
    type: 'system.backup_completed',
    title: 'Daily backup completed',
    body: 'Daily database backup completed successfully. Size: 2.4 GB. Duration: 12 minutes.',
    data: { sizeGB: 2.4, durationMinutes: 12, location: 's3://erp-backups/2026-03-13' },
    isRead: true,
    hoursAgo: 20,
  },
  {
    type: 'system.security_alert',
    title: 'Suspicious login activity detected',
    body: 'Multiple failed login attempts (8) detected from IP 185.234.xx.xx targeting tenant al-noor-trading. Account temporarily locked.',
    data: {
      ip: '185.234.xx.xx',
      tenantSlug: 'al-noor-trading',
      attempts: 8,
      action: 'account_locked',
    },
    isRead: false,
    hoursAgo: 7,
  },
  {
    type: 'system.security_alert',
    title: 'Admin login from new IP',
    body: 'Superadmin account logged in from a new IP address: 41.128.xx.xx (Egypt). If this was not you, secure your account immediately.',
    data: { ip: '41.128.xx.xx', country: 'Egypt', userAgent: 'Chrome/122 on Windows' },
    isRead: true,
    hoursAgo: 45,
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

    // ── Find superadmin ──────────────────────────────────────────────────────
    const [admins] = await sequelize.query(
      `SELECT id, email FROM public.admins WHERE email = 'superadmin@tatweer.com' AND "deletedAt" IS NULL`,
    );

    if ((admins as any[]).length === 0) {
      console.error('Superadmin not found. Run 04-demo-tenant.seed.ts first.');
      process.exit(1);
    }
    const adminId = (admins as any[])[0].id;
    console.log(`Superadmin ID: ${adminId}`);
    console.log(`Superadmin email: ${(admins as any[])[0].email}\n`);

    // ── Check existing ───────────────────────────────────────────────────────
    const [existing] = await sequelize.query(
      `SELECT COUNT(*)::int AS count FROM public.admin_notifications WHERE "adminId" = :adminId AND "deletedAt" IS NULL`,
      { replacements: { adminId } },
    );
    const existingCount = (existing as any[])[0]?.count ?? 0;

    if (existingCount > 0) {
      console.log(`${existingCount} admin notifications already exist. Skipping seed.`);
      console.log('To re-seed, delete existing records first:');
      console.log(`  DELETE FROM public.admin_notifications WHERE "adminId" = '${adminId}';`);
      return;
    }

    // ── Insert ───────────────────────────────────────────────────────────────
    console.log('=== Seeding Admin Notifications ===\n');

    let created = 0;
    for (const notif of ADMIN_NOTIFICATIONS) {
      const id = uuidv7();
      const createdAt = new Date(Date.now() - notif.hoursAgo * 3600000);
      const readAt = notif.isRead ? new Date(createdAt.getTime() + 1800000) : null;

      await sequelize.query(
        `INSERT INTO public.admin_notifications
         (id, "adminId", type, title, body, data, "isRead", "readAt", version, "createdAt", "updatedAt")
         VALUES (:id, :adminId, :type, :title, :body, :data::jsonb, :isRead, :readAt, 0, :createdAt, :createdAt)`,
        {
          replacements: {
            id,
            adminId,
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

      const status = notif.isRead ? '(read)' : '(unread)';
      console.log(`  [${notif.type}] ${notif.title} ${status}`);
      created++;
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const unreadCount = ADMIN_NOTIFICATIONS.filter((n) => !n.isRead).length;
    const readCount = ADMIN_NOTIFICATIONS.filter((n) => n.isRead).length;

    console.log('\n' + '='.repeat(50));
    console.log('Admin Notifications Seed Complete!');
    console.log('='.repeat(50));
    console.log(`Total created:   ${created}`);
    console.log(`Unread:          ${unreadCount}`);
    console.log(`Read:            ${readCount}`);
    console.log(`Admin:           superadmin@tatweer.com`);
  } catch (error) {
    console.error('Admin notifications seed failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
