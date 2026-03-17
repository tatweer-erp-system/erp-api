import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';

const TENANT_ID = '10000000-0000-0000-0000-000000000001';
const LOYALTY_PROGRAM_ID = 'D0000000-0000-0000-0000-000000000001';
const PARTNER_1_ID = '80000000-0000-0000-0000-000000000001';
const PARTNER_2_ID = '80000000-0000-0000-0000-000000000002';
const ORDER_1_ID = 'A3000000-0000-0000-0000-000000000001';
const USER_1_ID = '20000000-0000-0000-0000-000000000001';
const ORDER_2_ID = 'A3000000-0000-0000-0000-000000000002';
const ORDER_3_ID = 'A3000000-0000-0000-0000-000000000003';
const LOYALTY_ACCOUNT_1_ID = 'D1000000-0000-0000-0000-000000000001';
const LOYALTY_ACCOUNT_2_ID = 'D1000000-0000-0000-0000-000000000002';
const GIFT_CARD_1_ID = 'D2000000-0000-0000-0000-000000000001';
const GIFT_CARD_2_ID = 'D2000000-0000-0000-0000-000000000002';

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();

  // Loyalty Program
  await qi.bulkInsert('loyalty_programs', [
    {
      id: LOYALTY_PROGRAM_ID,
      tenantId: TENANT_ID,
      nameEn: 'Rewards Program',
      nameAr: 'برنامج المكافآت',
      descriptionEn: 'Earn points with every purchase and redeem for discounts',
      descriptionAr: 'اكسب نقاط مع كل عملية شراء واستبدلها بخصومات',
      isActive: true,
      pointsPerCurrency: 1,
      currencyPerPoint: 0.1,
      expiryDays: 365,
      minRedeemPoints: 100,
      maxRedeemPct: 50,
      settings: JSON.stringify({}),
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // Vouchers
  const VOUCHER_1_ID = uuidv7();
  const VOUCHER_3_ID = uuidv7();
  await qi.bulkInsert('vouchers', [
    {
      id: VOUCHER_1_ID,
      tenantId: TENANT_ID,
      code: 'WELCOME10',
      nameEn: 'Welcome 10%',
      nameAr: 'ترحيب 10%',
      descriptionEn: 'Welcome discount for new customers',
      descriptionAr: 'خصم ترحيبي للعملاء الجدد',
      type: 'discount',
      discountType: 'percent',
      discountValue: 10,
      minOrderAmount: 50,
      maxDiscountAmount: null,
      maxUses: 100,
      usedCount: 0,
      maxUsesPerCustomer: 1,
      customerId: null,
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      code: 'SUMMER25',
      nameEn: 'Summer Sale',
      nameAr: 'تخفيضات الصيف',
      descriptionEn: 'Summer season discount',
      descriptionAr: 'خصم موسم الصيف',
      type: 'discount',
      discountType: 'fixed',
      discountValue: 25,
      minOrderAmount: 100,
      maxDiscountAmount: null,
      maxUses: 50,
      usedCount: 0,
      maxUsesPerCustomer: 1,
      customerId: null,
      validFrom: '2026-06-01',
      validUntil: '2026-08-31',
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: VOUCHER_3_ID,
      tenantId: TENANT_ID,
      code: 'LOYALTY50',
      nameEn: 'Loyalty Reward',
      nameAr: 'مكافأة الولاء',
      descriptionEn: 'Loyalty reward voucher for loyal customers',
      descriptionAr: 'قسيمة مكافأة ولاء للعملاء المميزين',
      type: 'loyalty_reward',
      discountType: 'percent',
      discountValue: 15,
      minOrderAmount: 200,
      maxDiscountAmount: null,
      maxUses: 1,
      usedCount: 0,
      maxUsesPerCustomer: 1,
      customerId: PARTNER_1_ID,
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // Loyalty Tiers
  await qi.bulkInsert('loyalty_tiers', [
    {
      tenantId: TENANT_ID,
      programId: LOYALTY_PROGRAM_ID,
      nameEn: 'Bronze',
      nameAr: 'برونزي',
      descriptionEn: 'Entry level tier',
      descriptionAr: 'المستوى الأساسي',
      minPoints: 0,
      earnMultiplier: 1.0,
      redeemMultiplier: 1.0,
      color: '#CD7F32',
      benefits: JSON.stringify([]),
      sortOrder: 0,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      tenantId: TENANT_ID,
      programId: LOYALTY_PROGRAM_ID,
      nameEn: 'Silver',
      nameAr: 'فضي',
      descriptionEn: 'Mid level tier with bonus earning',
      descriptionAr: 'المستوى المتوسط مع مكافأة إضافية',
      minPoints: 500,
      earnMultiplier: 1.5,
      redeemMultiplier: 1.0,
      color: '#C0C0C0',
      benefits: JSON.stringify([]),
      sortOrder: 1,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      tenantId: TENANT_ID,
      programId: LOYALTY_PROGRAM_ID,
      nameEn: 'Gold',
      nameAr: 'ذهبي',
      descriptionEn: 'Top level tier with maximum benefits',
      descriptionAr: 'أعلى مستوى مع أقصى المزايا',
      minPoints: 1000,
      earnMultiplier: 2.0,
      redeemMultiplier: 1.0,
      color: '#FFD700',
      benefits: JSON.stringify([]),
      sortOrder: 2,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Loyalty Accounts — reference partnerId (not contactId)
  await qi.bulkInsert('loyalty_accounts', [
    {
      id: LOYALTY_ACCOUNT_1_ID,
      tenantId: TENANT_ID,
      customerId: PARTNER_1_ID,
      programId: LOYALTY_PROGRAM_ID,
      currentPoints: 250,
      lifetimePoints: 250,
      tierId: 1,
      enrolledAt: now,
      lastActivityAt: now,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: LOYALTY_ACCOUNT_2_ID,
      tenantId: TENANT_ID,
      customerId: PARTNER_2_ID,
      programId: LOYALTY_PROGRAM_ID,
      currentPoints: 100,
      lifetimePoints: 100,
      tierId: 1,
      enrolledAt: now,
      lastActivityAt: now,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Loyalty Transactions
  await qi.bulkInsert('loyalty_transactions', [
    {
      id: uuidv7(),
      accountId: LOYALTY_ACCOUNT_1_ID,
      orderId: ORDER_1_ID,
      type: 'earn',
      points: 200,
      balanceAfter: 200,
      description: 'Points earned from order',
      expiresAt: new Date('2027-03-14'),
      createdAt: now,
    },
    {
      id: uuidv7(),
      accountId: LOYALTY_ACCOUNT_1_ID,
      orderId: null,
      type: 'manual',
      points: 50,
      balanceAfter: 250,
      description: 'Bonus points granted by manager',
      expiresAt: new Date('2027-03-14'),
      createdAt: now,
    },
    {
      id: uuidv7(),
      accountId: LOYALTY_ACCOUNT_2_ID,
      orderId: ORDER_2_ID,
      type: 'earn',
      points: 100,
      balanceAfter: 100,
      description: 'Points earned from order',
      expiresAt: new Date('2027-03-14'),
      createdAt: now,
    },
    {
      id: uuidv7(),
      accountId: LOYALTY_ACCOUNT_1_ID,
      orderId: null,
      type: 'redeem',
      points: -50,
      balanceAfter: 200,
      description: 'Points redeemed for discount',
      expiresAt: null,
      createdAt: now,
    },
    {
      id: uuidv7(),
      accountId: LOYALTY_ACCOUNT_1_ID,
      orderId: ORDER_3_ID,
      type: 'earn',
      points: 150,
      balanceAfter: 350,
      description: 'Points earned from order',
      expiresAt: new Date('2027-03-14'),
      createdAt: now,
    },
  ]);

  // Voucher Redemptions
  await qi.bulkInsert('voucher_redemptions', [
    {
      id: uuidv7(),
      voucherId: VOUCHER_1_ID,
      orderId: ORDER_1_ID,
      customerId: PARTNER_1_ID,
      discountApplied: 6.5,
      redeemedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv7(),
      voucherId: VOUCHER_3_ID,
      orderId: ORDER_2_ID,
      customerId: PARTNER_1_ID,
      discountApplied: 30.0,
      redeemedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Gift Cards
  await qi.bulkInsert('gift_cards', [
    {
      id: GIFT_CARD_1_ID,
      tenantId: TENANT_ID,
      code: 'GC-100-001',
      initialBalance: 100.0,
      currentBalance: 75.0,
      currency: 'SAR',
      recipientName: null,
      recipientEmail: null,
      recipientPhone: null,
      issuedBy: USER_1_ID,
      issuedOrderId: null,
      issuedAt: now,
      expiresAt: '2027-12-31',
      isActive: true,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: GIFT_CARD_2_ID,
      tenantId: TENANT_ID,
      code: 'GC-200-001',
      initialBalance: 200.0,
      currentBalance: 200.0,
      currency: 'SAR',
      recipientName: null,
      recipientEmail: null,
      recipientPhone: null,
      issuedBy: USER_1_ID,
      issuedOrderId: null,
      issuedAt: now,
      expiresAt: '2027-12-31',
      isActive: true,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // Gift Card Transactions
  await qi.bulkInsert('gift_card_transactions', [
    {
      id: uuidv7(),
      giftCardId: GIFT_CARD_1_ID,
      orderId: null,
      type: 'redeem',
      amount: 25.0,
      balanceAfter: 75.0,
      createdBy: USER_1_ID,
      createdAt: now,
    },
    {
      id: uuidv7(),
      giftCardId: GIFT_CARD_2_ID,
      orderId: null,
      type: 'activate',
      amount: 200.0,
      balanceAfter: 200.0,
      createdBy: USER_1_ID,
      createdAt: now,
    },
  ]);

  console.log(
    '[11-loyalty] Seeded 1 loyalty program, 3 vouchers, 3 loyalty tiers, ' +
      '2 loyalty accounts, 5 loyalty transactions, 2 voucher redemptions, ' +
      '2 gift cards, 2 gift card transactions.',
  );
}
