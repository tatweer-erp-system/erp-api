/**
 * Wave 3 Currencies Seed
 * Seeds SAR, USD, EUR, AED, GBP currencies for the demo tenant,
 * inserts sample exchange rates, and back-fills currencyId on
 * existing records that reference SAR (the base currency).
 *
 * Run: npx ts-node -r tsconfig-paths/register src/seeds/wave-3-currencies.ts
 */
import { Sequelize } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USERNAME = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASS || 'postgres';
const DB_DATABASE = process.env.DB_NAME || 'erp_core';

const CURRENCIES = [
  {
    code: 'SAR',
    name: { en: 'Saudi Riyal', ar: 'ريال سعودي' },
    symbol: '﷼',
    isBase: true,
    decimalPlaces: 2,
  },
  {
    code: 'USD',
    name: { en: 'US Dollar', ar: 'دولار أمريكي' },
    symbol: '$',
    isBase: false,
    decimalPlaces: 2,
  },
  {
    code: 'EUR',
    name: { en: 'Euro', ar: 'يورو' },
    symbol: '€',
    isBase: false,
    decimalPlaces: 2,
  },
  {
    code: 'AED',
    name: { en: 'UAE Dirham', ar: 'درهم إماراتي' },
    symbol: 'د.إ',
    isBase: false,
    decimalPlaces: 2,
  },
  {
    code: 'GBP',
    name: { en: 'British Pound', ar: 'جنيه إسترليني' },
    symbol: '£',
    isBase: false,
    decimalPlaces: 2,
  },
];

// Rates to SAR (base), as of 2026-03-13
const EXCHANGE_RATES: Array<{ from: string; to: string; rate: number }> = [
  { from: 'USD', to: 'SAR', rate: 3.75 },
  { from: 'SAR', to: 'USD', rate: 0.2667 },
  { from: 'EUR', to: 'SAR', rate: 4.12 },
  { from: 'SAR', to: 'EUR', rate: 0.2427 },
  { from: 'AED', to: 'SAR', rate: 1.02 },
  { from: 'SAR', to: 'AED', rate: 0.9804 },
  { from: 'GBP', to: 'SAR', rate: 4.78 },
  { from: 'SAR', to: 'GBP', rate: 0.2092 },
];

const RATE_DATE = '2026-03-13';

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
    console.log('Connected.\n');

    const [tenants] = await sequelize.query(
      `SELECT id FROM public.tenants WHERE slug = 'demo' AND "deletedAt" IS NULL LIMIT 1`,
    );
    if ((tenants as any[]).length === 0) {
      console.error('No demo tenant found.');
      process.exit(1);
    }
    const tenantId = (tenants as any[])[0].id;
    console.log(`Tenant: ${tenantId}\n`);

    // Insert currencies
    const currencyIdByCode: Record<string, string> = {};

    for (const c of CURRENCIES) {
      // Check if already exists
      const [existing] = await sequelize.query(
        `SELECT id FROM public.currencies WHERE "tenantId" = :tenantId AND code = :code AND "deletedAt" IS NULL`,
        { replacements: { tenantId, code: c.code } },
      );

      let currencyId: string;
      if ((existing as any[]).length > 0) {
        currencyId = (existing as any[])[0].id;
        console.log(`  Currency ${c.code} already exists → id=${currencyId}`);
      } else {
        currencyId = uuidv4();
        await sequelize.query(
          `INSERT INTO public.currencies (id, "tenantId", code, name, symbol, "isBase", "isActive", "decimalPlaces", "createdAt", "updatedAt")
           VALUES (:id, :tenantId, :code, :name::jsonb, :symbol, :isBase, true, :decimalPlaces, NOW(), NOW())`,
          {
            replacements: {
              id: currencyId,
              tenantId,
              code: c.code,
              name: JSON.stringify(c.name),
              symbol: c.symbol,
              isBase: c.isBase,
              decimalPlaces: c.decimalPlaces,
            },
          },
        );
        console.log(`  Inserted currency ${c.code} → id=${currencyId}`);
      }
      currencyIdByCode[c.code] = currencyId;
    }

    // Insert exchange rates
    console.log('\nInserting exchange rates...');
    for (const r of EXCHANGE_RATES) {
      const fromId = currencyIdByCode[r.from];
      const toCurrId = currencyIdByCode[r.to];
      if (!fromId || !toCurrId) {
        console.log(`  Skipping rate ${r.from}→${r.to}: currency not found`);
        continue;
      }

      await sequelize.query(
        `INSERT INTO public.exchange_rates (id, "tenantId", "fromCurrencyId", "toCurrencyId", rate, "rateDate", source, "createdAt", "updatedAt")
         VALUES (:id, :tenantId, :fromCurrencyId, :toCurrencyId, :rate, :rateDate, 'seed', NOW(), NOW())
         ON CONFLICT ("tenantId", "fromCurrencyId", "toCurrencyId", "rateDate") DO UPDATE SET rate = :rate`,
        {
          replacements: {
            id: uuidv4(),
            tenantId,
            fromCurrencyId: fromId,
            toCurrencyId: toCurrId,
            rate: r.rate,
            rateDate: RATE_DATE,
          },
        },
      );
      console.log(`  Rate ${r.from}→${r.to}: ${r.rate}`);
    }

    // Back-fill currencyId on existing records using SAR (base)
    const sarId = currencyIdByCode['SAR'];
    if (sarId) {
      console.log('\nBack-filling currencyId on existing records with SAR...');

      await sequelize.query(
        `UPDATE public.pos_orders SET "currencyId" = :sarId WHERE "currencyId" IS NULL AND "tenantId" = :tenantId`,
        { replacements: { sarId, tenantId } },
      );
      console.log('  pos_orders ✓');

      await sequelize.query(
        `UPDATE public.pos_payments SET "currencyId" = :sarId WHERE "currencyId" IS NULL`,
        { replacements: { sarId } },
      );
      console.log('  pos_payments ✓');

      await sequelize.query(
        `UPDATE public.gift_cards SET "currencyId" = :sarId WHERE "currencyId" IS NULL AND "tenantId" = :tenantId`,
        { replacements: { sarId, tenantId } },
      );
      console.log('  gift_cards ✓');

      await sequelize.query(
        `UPDATE public.treasury_accounts SET "currencyId" = :sarId WHERE "currencyId" IS NULL AND "tenantId" = :tenantId`,
        { replacements: { sarId, tenantId } },
      );
      console.log('  treasury_accounts ✓');
    }

    console.log('\nWave 3 currencies seed complete.');
  } catch (e) {
    console.error('Seed failed:', e);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
