/**
 * Backfill provisioning data for existing tenants.
 *
 * Brings all existing tenants up to the new provisioning standard.
 * Fully idempotent — safe to run multiple times.
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/scripts/backfill-provisioning.ts
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';
import { SAUDI_COA_DEFAULTS, COA_SETTING_KEY_MAP } from '../common/defaults/saudi-coa.defaults';

dotenv.config();

async function main() {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'erp_core',
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const [tenants] = await sequelize.query(
      `SELECT id, slug FROM public.tenants WHERE "deletedAt" IS NULL ORDER BY "createdAt"`,
    );

    console.log(`Found ${(tenants as any[]).length} tenants to backfill`);

    for (const tenant of tenants as any[]) {
      const tenantId = tenant.id;
      const slug = tenant.slug;
      console.log(`\n── Processing tenant: ${slug} (${tenantId}) ──`);

      // 1. SAR currency
      const [sarRows] = await sequelize.query(
        `SELECT id FROM currencies WHERE "tenantId" = :tenantId AND code = 'SAR' LIMIT 1`,
        { replacements: { tenantId } },
      );
      let sarId: string;
      if ((sarRows as any[]).length === 0) {
        sarId = uuidv7();
        await sequelize.query(
          `INSERT INTO currencies (id, "tenantId", code, "nameEn", "nameAr", symbol, "isBase", "isActive", "decimalPlaces", "createdAt", "updatedAt")
           VALUES (:id, :tenantId, 'SAR', 'Saudi Riyal', 'ريال سعودي', 'ر.س', true, true, 2, NOW(), NOW())`,
          { replacements: { id: sarId, tenantId } },
        );
        console.log('  + SAR currency created');
      } else {
        sarId = (sarRows as any[])[0].id;
        console.log('  . SAR currency exists');
      }

      // 2. COA accounts
      const [coaSeeded] = await sequelize.query(
        `SELECT value FROM tenant_settings WHERE "tenantId" = :tenantId AND key = 'coaSeeded' LIMIT 1`,
        { replacements: { tenantId } },
      );
      if ((coaSeeded as any[]).length === 0) {
        const accountByCode = new Map<string, string>();
        for (const acct of SAUDI_COA_DEFAULTS) {
          const [existing] = await sequelize.query(
            `SELECT id FROM chart_of_accounts WHERE "tenantId" = :tenantId AND code = :code AND "deletedAt" IS NULL LIMIT 1`,
            { replacements: { tenantId, code: acct.code } },
          );
          if ((existing as any[]).length === 0) {
            const accountId = uuidv7();
            await sequelize.query(
              `INSERT INTO chart_of_accounts (id, "tenantId", code, "nameEn", "nameAr", type, "normalBalance", "allowDirectPosting", "isActive", version, "createdAt", "updatedAt")
               VALUES (:id, :tenantId, :code, :nameEn, :nameAr, :type, :normalBalance, :allowDirectPosting, :isActive, 0, NOW(), NOW())`,
              {
                replacements: {
                  id: accountId,
                  tenantId,
                  code: acct.code,
                  nameEn: acct.nameEn,
                  nameAr: acct.nameAr,
                  type: acct.accountType,
                  normalBalance: acct.normalBalance,
                  allowDirectPosting: acct.allowDirectPosting,
                  isActive: acct.isActive,
                },
              },
            );
            accountByCode.set(acct.code, accountId);
          } else {
            accountByCode.set(acct.code, (existing as any[])[0].id);
          }
        }
        console.log(`  + COA accounts backfilled (${accountByCode.size} total)`);

        // COA settings
        for (const [key, code] of Object.entries(COA_SETTING_KEY_MAP)) {
          const accountId = accountByCode.get(code);
          if (accountId) {
            await sequelize.query(
              `INSERT INTO tenant_settings (id, "tenantId", key, value, "group", type, version, "createdAt", "updatedAt")
               VALUES (:id, :tenantId, :key, :value, 'accounting', 'string', 0, NOW(), NOW())
               ON CONFLICT ("tenantId", key) DO UPDATE SET value = :value, "updatedAt" = NOW()`,
              { replacements: { id: uuidv7(), tenantId, key, value: accountId } },
            );
          }
        }
        await sequelize.query(
          `INSERT INTO tenant_settings (id, "tenantId", key, value, "group", type, version, "createdAt", "updatedAt")
           VALUES (:id, :tenantId, 'coaSeeded', 'true', 'accounting', 'boolean', 0, NOW(), NOW())
           ON CONFLICT ("tenantId", key) DO UPDATE SET value = 'true', "updatedAt" = NOW()`,
          { replacements: { id: uuidv7(), tenantId } },
        );
        console.log('  + COA settings seeded');
      } else {
        console.log('  . COA already seeded');
      }

      // 3. General settings (upsert each)
      const generalSettings = [
        { key: 'fiscalYearStartMonth', value: '1', group: 'accounting', type: 'number' },
        { key: 'defaultCurrency', value: 'SAR', group: 'general', type: 'string' },
        { key: 'salaryCalculationBasis', value: 'actualDays', group: 'hr', type: 'string' },
        { key: 'timezone', value: 'Asia/Riyadh', group: 'general', type: 'string' },
        { key: 'vatRate', value: '15', group: 'accounting', type: 'number' },
        { key: 'allowNegativeStock', value: 'false', group: 'inventory', type: 'boolean' },
      ];
      for (const s of generalSettings) {
        await sequelize.query(
          `INSERT INTO tenant_settings (id, "tenantId", key, value, "group", type, version, "createdAt", "updatedAt")
           VALUES (:id, :tenantId, :key, :value, :group, :type, 0, NOW(), NOW())
           ON CONFLICT ("tenantId", key) DO NOTHING`,
          { replacements: { id: uuidv7(), tenantId, ...s } },
        );
      }
      console.log('  + General settings upserted');

      // 4. Fiscal periods (current year)
      const year = new Date().getFullYear();
      const [existingPeriods] = await sequelize.query(
        `SELECT COUNT(*) as cnt FROM fiscal_periods WHERE "tenantId" = :tenantId AND "fiscalYear" = :year`,
        { replacements: { tenantId, year } },
      );
      if (Number((existingPeriods as any[])[0].cnt) === 0) {
        for (let i = 0; i < 12; i++) {
          const startDate = new Date(year, i, 1);
          const endDate = new Date(year, i + 1, 0);
          await sequelize.query(
            `INSERT INTO fiscal_periods ("tenantId", "nameEn", "nameAr", "fiscalYear", "periodNumber", "periodType", "startDate", "endDate", status, version, "createdAt", "updatedAt")
             VALUES (:tenantId, :nameEn, :nameAr, :fiscalYear, :periodNumber, 'monthly', :startDate, :endDate, 'open', 0, NOW(), NOW())`,
            {
              replacements: {
                tenantId,
                nameEn: startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                nameAr: startDate.toLocaleString('ar-SA', { month: 'long', year: 'numeric' }),
                fiscalYear: year,
                periodNumber: i + 1,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
              },
            },
          );
        }
        console.log(`  + 12 fiscal periods created (${year})`);
      } else {
        console.log(`  . Fiscal periods exist (${year})`);
      }

      // 5. Default warehouse
      const [whRows] = await sequelize.query(
        `SELECT id FROM warehouses WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL LIMIT 1`,
        { replacements: { tenantId } },
      );
      if ((whRows as any[]).length === 0) {
        const [branchRows] = await sequelize.query(
          `SELECT id FROM branches WHERE "tenantId" = :tenantId AND "isMain" = true AND "deletedAt" IS NULL LIMIT 1`,
          { replacements: { tenantId } },
        );
        const branchId = (branchRows as any[])[0]?.id ?? null;
        await sequelize.query(
          `INSERT INTO warehouses (id, "tenantId", "nameEn", "nameAr", "branchId", "isActive", "allowNegativeStock", version, "createdAt", "updatedAt")
           VALUES (:id, :tenantId, 'Main Warehouse', 'المستودع الرئيسي', :branchId, true, false, 0, NOW(), NOW())`,
          { replacements: { id: uuidv7(), tenantId, branchId } },
        );
        console.log('  + Default warehouse created');
      } else {
        console.log('  . Warehouse exists');
      }

      // 6. Default department
      const [deptRows] = await sequelize.query(
        `SELECT id FROM departments WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL LIMIT 1`,
        { replacements: { tenantId } },
      );
      if ((deptRows as any[]).length === 0) {
        await sequelize.query(
          `INSERT INTO departments (id, "tenantId", "nameEn", "nameAr", "descriptionEn", "descriptionAr", version, "createdAt", "updatedAt")
           VALUES (:id, :tenantId, 'General', 'عام', 'Default department', 'القسم الافتراضي', 0, NOW(), NOW())`,
          { replacements: { id: uuidv7(), tenantId } },
        );
        console.log('  + Default department created');
      } else {
        console.log('  . Department exists');
      }

      // 7. Default shift
      const [shiftRows] = await sequelize.query(
        `SELECT id FROM shifts WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL LIMIT 1`,
        { replacements: { tenantId } },
      );
      if ((shiftRows as any[]).length === 0) {
        await sequelize.query(
          `INSERT INTO shifts (id, "tenantId", "nameEn", "nameAr", "startTime", "endTime", "breakMinutes", "workingDays", "isActive", version, "createdAt", "updatedAt")
           VALUES (:id, :tenantId, 'Morning Shift', 'الدوام الصباحي', '08:00', '16:00', 60, :workingDays, true, 0, NOW(), NOW())`,
          {
            replacements: {
              id: uuidv7(),
              tenantId,
              workingDays: JSON.stringify([0, 1, 2, 3, 4]),
            },
          },
        );
        console.log('  + Default shift created');
      } else {
        console.log('  . Shift exists');
      }

      // 8. Default treasury account
      const [treasuryRows] = await sequelize.query(
        `SELECT id FROM treasury_accounts WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL LIMIT 1`,
        { replacements: { tenantId } },
      );
      if ((treasuryRows as any[]).length === 0) {
        const [cashAcctRows] = await sequelize.query(
          `SELECT id FROM chart_of_accounts WHERE "tenantId" = :tenantId AND code = '1100' AND "deletedAt" IS NULL LIMIT 1`,
          { replacements: { tenantId } },
        );
        const [branchRows2] = await sequelize.query(
          `SELECT id FROM branches WHERE "tenantId" = :tenantId AND "isMain" = true AND "deletedAt" IS NULL LIMIT 1`,
          { replacements: { tenantId } },
        );
        await sequelize.query(
          `INSERT INTO treasury_accounts (id, "tenantId", "nameEn", "nameAr", type, currency, "currentBalance", "coaAccountId", "branchId", "isDefault", "isActive", version, "createdAt", "updatedAt")
           VALUES (:id, :tenantId, 'Main Cash', 'الصندوق الرئيسي', 'cash', 'SAR', 0, :coaAccountId, :branchId, true, true, 0, NOW(), NOW())`,
          {
            replacements: {
              id: uuidv7(),
              tenantId,
              coaAccountId: (cashAcctRows as any[])[0]?.id ?? null,
              branchId: (branchRows2 as any[])[0]?.id ?? null,
            },
          },
        );
        console.log('  + Default treasury account created');
      } else {
        console.log('  . Treasury account exists');
      }

      // 9. Notification templates
      const [tmplRows] = await sequelize.query(
        `SELECT COUNT(*) as cnt FROM notification_templates WHERE "tenantId" = :tenantId`,
        { replacements: { tenantId } },
      );
      if (Number((tmplRows as any[])[0].cnt) === 0) {
        const templates = [
          {
            eventType: 'pos_checkout',
            channel: 'push',
            subjectEn: 'Receipt for {{orderNumber}}',
            subjectAr: 'إيصال الطلب {{orderNumber}}',
            bodyEn: 'Your order {{orderNumber}} total: {{totalAmount}} {{currency}}',
            bodyAr: 'إجمالي طلبك {{orderNumber}}: {{totalAmount}} {{currency}}',
          },
          {
            eventType: 'loyalty_earn',
            channel: 'push',
            subjectEn: 'Points earned',
            subjectAr: 'نقاط مكتسبة',
            bodyEn: 'You earned {{points}} points. Balance: {{balance}}',
            bodyAr: 'اكتسبت {{points}} نقطة. الرصيد: {{balance}}',
          },
          {
            eventType: 'low_stock_alert',
            channel: 'in_app',
            subjectEn: 'Low stock: {{productNameEn}}',
            subjectAr: 'مخزون منخفض: {{productNameAr}}',
            bodyEn: 'Only {{currentQty}} units remaining',
            bodyAr: 'تبقى {{currentQty}} وحدة فقط',
          },
          {
            eventType: 'payroll_approved',
            channel: 'in_app',
            subjectEn: 'Payroll approved',
            subjectAr: 'تمت الموافقة على الراتب',
            bodyEn: 'Your payroll for {{period}} has been approved',
            bodyAr: 'تمت الموافقة على راتبك لـ {{period}}',
          },
          {
            eventType: 'sales_order_confirmed',
            channel: 'in_app',
            subjectEn: 'Sales order confirmed',
            subjectAr: 'تم تأكيد أمر البيع',
            bodyEn: 'Sales order {{orderNumber}} has been confirmed',
            bodyAr: 'تم تأكيد أمر البيع {{orderNumber}}',
          },
          {
            eventType: 'purchase_order_received',
            channel: 'in_app',
            subjectEn: 'PO received',
            subjectAr: 'تم استلام أمر الشراء',
            bodyEn: 'Purchase order {{orderNumber}} has been received',
            bodyAr: 'تم استلام أمر الشراء {{orderNumber}}',
          },
        ];
        for (const t of templates) {
          await sequelize.query(
            `INSERT INTO notification_templates ("tenantId", "tenantSlug", "eventType", channel, "subjectEn", "subjectAr", "bodyEn", "bodyAr", "isDefault", version, "createdAt", "updatedAt")
             VALUES (:tenantId, :tenantSlug, :eventType, :channel, :subjectEn, :subjectAr, :bodyEn, :bodyAr, true, 0, NOW(), NOW())`,
            { replacements: { tenantId, tenantSlug: slug, ...t } },
          );
        }
        console.log('  + Notification templates created');
      } else {
        console.log('  . Notification templates exist');
      }

      // 10. USD currency + exchange rate
      const [usdRows] = await sequelize.query(
        `SELECT id FROM currencies WHERE "tenantId" = :tenantId AND code = 'USD' LIMIT 1`,
        { replacements: { tenantId } },
      );
      if ((usdRows as any[]).length === 0) {
        const usdId = uuidv7();
        await sequelize.query(
          `INSERT INTO currencies (id, "tenantId", code, "nameEn", "nameAr", symbol, "isBase", "isActive", "decimalPlaces", "createdAt", "updatedAt")
           VALUES (:id, :tenantId, 'USD', 'US Dollar', 'دولار أمريكي', '$', false, true, 2, NOW(), NOW())`,
          { replacements: { id: usdId, tenantId } },
        );
        const today = new Date().toISOString().split('T')[0];
        await sequelize.query(
          `INSERT INTO exchange_rates (id, "tenantId", "fromCurrencyId", "toCurrencyId", rate, "rateDate", source, "createdAt", "updatedAt")
           VALUES (:id1, :tenantId, :usdId, :sarId, 3.75, :rateDate, 'manual', NOW(), NOW()),
                  (:id2, :tenantId, :sarId, :usdId, 0.2667, :rateDate, 'manual', NOW(), NOW())`,
          {
            replacements: { id1: uuidv7(), id2: uuidv7(), tenantId, usdId, sarId, rateDate: today },
          },
        );
        console.log('  + USD currency + exchange rates created');
      } else {
        console.log('  . USD currency exists');
      }

      // 11. Default product category
      const [catRows] = await sequelize.query(
        `SELECT id FROM product_categories WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL LIMIT 1`,
        { replacements: { tenantId } },
      );
      if ((catRows as any[]).length === 0) {
        await sequelize.query(
          `INSERT INTO product_categories (id, "tenantId", "nameEn", "nameAr", "descriptionEn", "descriptionAr", version, "createdAt", "updatedAt")
           VALUES (:id, :tenantId, 'General', 'عام', 'Default product category', 'الفئة الافتراضية للمنتجات', 0, NOW(), NOW())`,
          { replacements: { id: uuidv7(), tenantId } },
        );
        console.log('  + Default product category created');
      } else {
        console.log('  . Product category exists');
      }

      // 12. Default cost center
      const [ccRows] = await sequelize.query(
        `SELECT id FROM cost_centers WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL LIMIT 1`,
        { replacements: { tenantId } },
      );
      if ((ccRows as any[]).length === 0) {
        await sequelize.query(
          `INSERT INTO cost_centers (id, "tenantId", code, "nameEn", "nameAr", "isActive", version, "createdAt", "updatedAt")
           VALUES (:id, :tenantId, 'CC-001', 'General', 'عام', true, 0, NOW(), NOW())`,
          { replacements: { id: uuidv7(), tenantId } },
        );
        console.log('  + Default cost center created');
      } else {
        console.log('  . Cost center exists');
      }

      console.log(`  ✓ Done: ${slug}`);
    }

    console.log('\n=== Backfill complete ===');
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
