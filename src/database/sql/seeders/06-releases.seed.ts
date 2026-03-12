/**
 * 06 — Releases Seeder
 *
 * Seeds the public.releases table with initial release notes.
 * Idempotent: skips rows that already exist (matched by version).
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/database/sql/seeders/06-releases.seed.ts
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

interface ReleaseData {
  version: string;
  date: string;
  type: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  changes: string;
  tour: string | null;
  is_published: boolean;
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
    console.log('Connected to database.');

    const now = new Date();

    const releases: ReleaseData[] = [
      {
        version: '1.0.0',
        date: '2026-01-15',
        type: 'major',
        title_en: 'Initial Release',
        title_ar: 'الإصدار الأولي',
        description_en: 'First release of Tatweer ERP Backoffice with core management features.',
        description_ar: 'الإصدار الأول لنظام تتوير ERP مع ميزات الإدارة الأساسية.',
        changes: JSON.stringify([
          {
            category: 'feature',
            text: {
              en: 'Dashboard with key metrics and activity overview',
              ar: 'لوحة تحكم مع المقاييس الرئيسية ونظرة عامة على النشاط',
            },
          },
          {
            category: 'feature',
            text: {
              en: 'Tenant management with CRUD operations',
              ar: 'إدارة المستأجرين مع عمليات الإنشاء والقراءة والتحديث والحذف',
            },
          },
          {
            category: 'feature',
            text: {
              en: 'Subscription plans and billing management',
              ar: 'خطط الاشتراك وإدارة الفوترة',
            },
          },
          {
            category: 'feature',
            text: {
              en: 'Support ticket system',
              ar: 'نظام تذاكر الدعم',
            },
          },
          {
            category: 'feature',
            text: {
              en: 'Multi-language support (English & Arabic with RTL)',
              ar: 'دعم متعدد اللغات (الإنجليزية والعربية مع RTL)',
            },
          },
          {
            category: 'feature',
            text: {
              en: 'Role-based access control with 4 permission levels',
              ar: 'التحكم في الوصول المبني على الأدوار مع 4 مستويات أذونات',
            },
          },
        ]),
        tour: JSON.stringify([
          {
            target: "[data-tour='sidebar-dashboard']",
            title: { en: 'Dashboard', ar: 'لوحة التحكم' },
            description: {
              en: 'Your central hub for monitoring tenant activity, subscriptions, and revenue.',
              ar: 'مركزك الرئيسي لمراقبة نشاط المستأجرين والاشتراكات والإيرادات.',
            },
            placement: 'right',
          },
          {
            target: "[data-tour='sidebar-tenants']",
            title: { en: 'Tenant Management', ar: 'إدارة المستأجرين' },
            description: {
              en: 'Manage all tenants, their subscriptions, users, and settings.',
              ar: 'إدارة جميع المستأجرين واشتراكاتهم ومستخدميهم وإعداداتهم.',
            },
            placement: 'right',
          },
          {
            target: "[data-tour='navbar-search']",
            title: { en: 'Global Search', ar: 'البحث العام' },
            description: {
              en: 'Quickly find tenants, tickets, and settings from anywhere.',
              ar: 'البحث السريع عن المستأجرين والتذاكر والإعدادات من أي مكان.',
            },
            placement: 'bottom',
          },
        ]),
        is_published: true,
      },
      {
        version: '1.1.0',
        date: '2026-02-20',
        type: 'minor',
        title_en: 'Tenant Management Improvements',
        title_ar: 'تحسينات إدارة المستأجرين',
        description_en:
          'Better tenant details, subscription tracking, and support ticket management.',
        description_ar: 'تحسين تفاصيل المستأجرين وتتبع الاشتراكات وإدارة تذاكر الدعم.',
        changes: JSON.stringify([
          {
            category: 'feature',
            text: {
              en: 'Tenant details page with tabs for subscriptions, users, and audit logs',
              ar: 'صفحة تفاصيل المستأجر مع علامات تبويب للاشتراكات والمستخدمين وسجلات المراجعة',
            },
          },
          {
            category: 'improvement',
            text: {
              en: 'Improved subscription analytics with revenue charts',
              ar: 'تحسين تحليلات الاشتراكات مع رسوم بيانية للإيرادات',
            },
          },
          {
            category: 'fix',
            text: {
              en: 'Fixed pagination on tickets list not resetting on filter change',
              ar: 'إصلاح ترقيم الصفحات في قائمة التذاكر عند تغيير الفلتر',
            },
          },
        ]),
        tour: null,
        is_published: true,
      },
      {
        version: '1.2.0',
        date: '2026-03-12',
        type: 'minor',
        title_en: 'Audit Logs & Release Notes',
        title_ar: 'سجلات المراجعة وملاحظات الإصدار',
        description_en:
          'Enhanced audit logging with user details, request tracking, and a brand new release notes system.',
        description_ar:
          'تحسين سجلات المراجعة مع تفاصيل المستخدم وتتبع الطلبات ونظام ملاحظات الإصدار الجديد.',
        changes: JSON.stringify([
          {
            category: 'feature',
            text: {
              en: 'Added release notes page with version history and guided tours',
              ar: 'إضافة صفحة ملاحظات الإصدار مع تاريخ الإصدارات والجولات الإرشادية',
            },
          },
          {
            category: 'feature',
            text: {
              en: 'Audit logs now show user type badge (Admin/User) and request ID',
              ar: 'سجلات المراجعة تعرض الآن شارة نوع المستخدم (مدير/مستخدم) ومعرف الطلب',
            },
          },
          {
            category: 'improvement',
            text: {
              en: 'Enhanced target column with copy-to-clipboard and full ID tooltip',
              ar: 'تحسين عمود الهدف مع النسخ والتلميح بالمعرف الكامل',
            },
          },
          {
            category: 'fix',
            text: {
              en: 'Fixed timestamps showing as empty objects in API responses',
              ar: 'إصلاح عرض الطوابع الزمنية ككائنات فارغة في استجابات API',
            },
          },
        ]),
        tour: JSON.stringify([
          {
            target: "[data-tour='sidebar-audit']",
            title: { en: 'Audit Logs', ar: 'سجلات المراجعة' },
            description: {
              en: 'Track all system activities with detailed user info and request tracing.',
              ar: 'تتبع جميع أنشطة النظام مع معلومات المستخدم التفصيلية وتتبع الطلبات.',
            },
            placement: 'right',
          },
          {
            target: "[data-tour='sidebar-releases']",
            title: { en: 'Release Notes', ar: 'ملاحظات الإصدار' },
            description: {
              en: 'View version history and take guided tours of new features.',
              ar: 'عرض تاريخ الإصدارات والقيام بجولات إرشادية للميزات الجديدة.',
            },
            placement: 'right',
          },
          {
            target: "[data-tour='whats-new']",
            title: { en: "What's New", ar: 'ما الجديد' },
            description: {
              en: "This icon shows when there's a new release. Click to see what changed.",
              ar: 'هذا الرمز يظهر عند وجود إصدار جديد. انقر لمعرفة ما تغير.',
            },
            placement: 'bottom',
          },
        ]),
        is_published: true,
      },
    ];

    for (const release of releases) {
      const [existing] = await sequelize.query(
        `SELECT id FROM public.releases WHERE version = :version AND deleted_at IS NULL`,
        { replacements: { version: release.version } },
      );

      if ((existing as any[]).length > 0) {
        await sequelize.query(
          `UPDATE public.releases
           SET date = :date, type = :type,
               title_en = :title_en, title_ar = :title_ar,
               description_en = :description_en, description_ar = :description_ar,
               changes = :changes::jsonb,
               tour = ${release.tour ? ':tour::jsonb' : 'NULL'},
               is_published = :is_published,
               updated_at = :now
           WHERE version = :version AND deleted_at IS NULL`,
          {
            replacements: { ...release, now },
          },
        );
        console.log(`Updated release: v${release.version}`);
      } else {
        await sequelize.query(
          `INSERT INTO public.releases
           (version, date, type, title_en, title_ar, description_en, description_ar,
            changes, tour, is_published, created_at, updated_at)
           VALUES (:version, :date, :type, :title_en, :title_ar, :description_en, :description_ar,
                   :changes::jsonb, ${release.tour ? ':tour::jsonb' : 'NULL'}, :is_published, :now, :now)`,
          {
            replacements: { ...release, now },
          },
        );
        console.log(`Created release: v${release.version}`);
      }
    }

    console.log('\n--- Releases Seed Complete ---');
  } catch (error) {
    console.error('Releases seed failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
