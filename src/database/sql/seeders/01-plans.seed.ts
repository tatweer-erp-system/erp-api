/**
 * 01 — Plans Seeder
 *
 * Seeds the public.plans table with the four standard plans.
 * Idempotent: skips rows that already exist (matched by slug).
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/database/sql/seeders/01-plans.seed.ts
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

    const plans = [
      {
        slug: 'starter',
        name: JSON.stringify({ en: 'Starter', ar: 'المبتدئ' }),
        description: JSON.stringify({
          en: 'Free plan for small teams',
          ar: 'خطة مجانية للفرق الصغيرة',
        }),
        monthlyPrice: 0,
        annualPrice: 0,
        currency: 'SAR',
        modules: JSON.stringify(['crm']),
        maxUsers: 3,
        features: JSON.stringify({ in_app_notifications: true }),
        isActive: true,
        sortOrder: 1,
      },
      {
        slug: 'growth',
        name: JSON.stringify({ en: 'Growth', ar: 'النمو' }),
        description: JSON.stringify({ en: 'For growing businesses', ar: 'للأعمال المتنامية' }),
        monthlyPrice: 299,
        annualPrice: 2990,
        currency: 'SAR',
        modules: JSON.stringify(['crm', 'hr', 'inventory']),
        maxUsers: 10,
        features: JSON.stringify({ in_app_notifications: true, email_notifications: true }),
        isActive: true,
        sortOrder: 2,
      },
      {
        slug: 'business',
        name: JSON.stringify({ en: 'Business', ar: 'الأعمال' }),
        description: JSON.stringify({
          en: 'Full-featured plan for established businesses',
          ar: 'خطة متكاملة للأعمال الراسخة',
        }),
        monthlyPrice: 699,
        annualPrice: 6990,
        currency: 'SAR',
        modules: JSON.stringify(['crm', 'hr', 'inventory', 'projects', 'purchasing']),
        maxUsers: 50,
        features: JSON.stringify({
          in_app_notifications: true,
          email_notifications: true,
          sms_notifications: true,
          pdf_export: true,
        }),
        isActive: true,
        sortOrder: 3,
      },
      {
        slug: 'enterprise',
        name: JSON.stringify({ en: 'Enterprise', ar: 'المؤسسي' }),
        description: JSON.stringify({
          en: 'Unlimited access to all modules',
          ar: 'وصول غير محدود لجميع الوحدات',
        }),
        monthlyPrice: 1499,
        annualPrice: 14990,
        currency: 'SAR',
        modules: JSON.stringify(['*']),
        maxUsers: null,
        features: JSON.stringify({
          in_app_notifications: true,
          email_notifications: true,
          sms_notifications: true,
          push_notifications: true,
          pdf_export: true,
          advanced_reporting: true,
        }),
        isActive: true,
        sortOrder: 4,
      },
    ];

    // Delete existing plans seeded by migration and re-insert
    for (const plan of plans) {
      const [existing] = await sequelize.query(`SELECT id FROM public.plans WHERE slug = :slug`, {
        replacements: { slug: plan.slug },
      });

      if ((existing as any[]).length > 0) {
        // Update existing plan
        await sequelize.query(
          `UPDATE public.plans
           SET name = :name::jsonb, description = :description::jsonb,
               "monthlyPrice" = :monthlyPrice, "annualPrice" = :annualPrice,
               currency = :currency, modules = :modules::jsonb,
               "maxUsers" = :maxUsers, features = :features::jsonb,
               "isActive" = :isActive, "sortOrder" = :sortOrder,
               "updatedAt" = :now
           WHERE slug = :slug`,
          {
            replacements: { ...plan, now },
          },
        );
        console.log(`Updated plan: ${plan.slug}`);
      } else {
        await sequelize.query(
          `INSERT INTO public.plans
           (slug, name, description, "monthlyPrice", "annualPrice", currency,
            modules, "maxUsers", features, "isActive", "sortOrder", "createdAt", "updatedAt")
           VALUES (:slug, :name::jsonb, :description::jsonb, :monthlyPrice, :annualPrice, :currency,
                   :modules::jsonb, :maxUsers, :features::jsonb, :isActive, :sortOrder, :now, :now)`,
          {
            replacements: { ...plan, now },
          },
        );
        console.log(`Created plan: ${plan.slug}`);
      }
    }

    console.log('\n--- Plans Seed Complete ---');
  } catch (error) {
    console.error('Plans seed failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
