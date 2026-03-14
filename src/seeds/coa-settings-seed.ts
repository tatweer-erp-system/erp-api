/**
 * COA Settings Seed
 *
 * For every tenant that has COA seeded (coaSeeded = 'true'),
 * finds the chart_of_accounts entries by code and upserts
 * the corresponding tenant_settings keys so journal posting
 * can resolve account IDs at runtime.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/seeds/coa-settings-seed.ts
 */
import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

const keyToCode: Record<string, string> = {
  coaCash: '1101',
  coaAccountsReceivable: '1201',
  coaInventory: '1301',
  coaSalesRevenue: '4101',
  coaCogs: '5101',
  coaVatPayable: '2105',
  coaLoyaltyLiability: '2108',
  coaGiftCardLiability: '2109',
  coaSalariesPayable: '2104',
  coaGosiPayable: '2106',
  coaSalariesExpense: '5201',
  coaGosiExpense: '5204',
  coaAccountsPayable: '2101',
  coaInventoryAdjustment: '5303',
  coaFxGainLoss: '5304',
};

async function run() {
  const sequelize = new Sequelize(
    process.env.DATABASE_URL ??
      `postgres://${process.env.DB_USER ?? 'postgres'}:${process.env.DB_PASSWORD ?? 'postgres'}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'erp_core'}`,
    { logging: false },
  );

  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    // Find all tenants that have COA seeded
    const [tenants] = await sequelize.query(
      `SELECT DISTINCT t.id AS "tenantId"
       FROM tenants t
       JOIN tenant_settings ts ON ts."tenantId" = t.id
       WHERE ts.key = 'coaSeeded' AND ts.value = 'true' AND ts."deletedAt" IS NULL AND t."deletedAt" IS NULL`,
    );

    if ((tenants as any[]).length === 0) {
      // If no coaSeeded setting, try all tenants that have chart_of_accounts entries
      const [tenantsWithCoa] = await sequelize.query(
        `SELECT DISTINCT "tenantId" FROM chart_of_accounts WHERE "deletedAt" IS NULL`,
      );
      if ((tenantsWithCoa as any[]).length === 0) {
        console.log('No tenants with COA found. Nothing to seed.');
        return;
      }
      (tenants as any[]).push(...(tenantsWithCoa as any[]));
    }

    let totalUpserted = 0;

    for (const tenant of tenants as any[]) {
      const tenantId = tenant.tenantId;
      console.log(`\nProcessing tenant: ${tenantId}`);

      // Fetch all accounts for this tenant
      const [accounts] = await sequelize.query(
        `SELECT id, code FROM chart_of_accounts WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL`,
        { replacements: { tenantId } },
      );

      const accountByCode = new Map<string, string>();
      for (const acc of accounts as any[]) {
        accountByCode.set(acc.code, acc.id);
      }

      for (const [key, code] of Object.entries(keyToCode)) {
        const accountId = accountByCode.get(code);
        if (accountId) {
          await sequelize.query(
            `INSERT INTO tenant_settings (id, "tenantId", key, value, "group", type, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), :tenantId, :key, :value, 'accounting', 'string', NOW(), NOW())
             ON CONFLICT ("tenantId", key) WHERE "deletedAt" IS NULL DO UPDATE SET value = :value, "updatedAt" = NOW()`,
            { replacements: { tenantId, key, value: accountId } },
          );
          totalUpserted++;
          console.log(`  ✅ ${key} → ${code} (${accountId})`);
        } else {
          console.log(`  ⚠️  ${key} → ${code} — account not found, skipping`);
        }
      }
    }

    console.log(
      `\nDone. Upserted ${totalUpserted} settings across ${(tenants as any[]).length} tenant(s).`,
    );
  } finally {
    await sequelize.close();
  }
}

run().catch((err) => {
  console.error('COA settings seed failed:', err);
  process.exit(1);
});
