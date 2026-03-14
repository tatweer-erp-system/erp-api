import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';

// ── 10 Tenants ──────────────────────────────────────────────────────────────────
const TENANT_IDS = [
  '10000000-0000-0000-0000-000000000001', // Demo Company
  '10000000-0000-0000-0000-000000000002', // Alpha Trading
  '10000000-0000-0000-0000-000000000003', // Beta Tech
  '10000000-0000-0000-0000-000000000004', // Gamma Restaurant
  '10000000-0000-0000-0000-000000000005', // Delta Retail
  '10000000-0000-0000-0000-000000000006', // Epsilon Services
  '10000000-0000-0000-0000-000000000007', // Zeta Construction
  '10000000-0000-0000-0000-000000000008', // Eta Healthcare
  '10000000-0000-0000-0000-000000000009', // Theta Education
  '10000000-0000-0000-0000-000000000010', // Iota Logistics
];

const TENANT_SLUGS = [
  'demo-company',
  'alpha-trading',
  'beta-tech',
  'gamma-restaurant',
  'delta-retail',
  'epsilon-services',
  'zeta-construction',
  'eta-healthcare',
  'theta-education',
  'iota-logistics',
];

const SUBSCRIPTION_IDS = TENANT_IDS.map(
  (_, i) => `10000000-0000-0000-0000-0000000000${String(20 + i).padStart(2, '0')}`,
);

interface TenantDef {
  nameEn: string;
  nameAr: string;
  status: string;
  planId: number;
  billingCycle: string;
  trialEndsAt: Date | null;
  suspendedAt: Date | null;
  cancelledAt: Date | null;
  suspendReason: string | null;
  features: Record<string, boolean>;
  modules: string[];
}

const tenantDefs: TenantDef[] = [
  {
    nameEn: 'Demo Company',
    nameAr: 'شركة تجريبية',
    status: 'active',
    planId: 3,
    billingCycle: 'annual',
    trialEndsAt: null,
    suspendedAt: null,
    cancelledAt: null,
    suspendReason: null,
    features: {
      hr: true,
      inventory: true,
      crm: true,
      purchasing: true,
      projects: true,
      chat: true,
      reporting: true,
    },
    modules: ['pos', 'inventory', 'crm', 'purchasing', 'hr', 'projects', 'reporting', 'chat'],
  },
  {
    nameEn: 'Alpha Trading',
    nameAr: 'ألفا للتجارة',
    status: 'active',
    planId: 3,
    billingCycle: 'annual',
    trialEndsAt: null,
    suspendedAt: null,
    cancelledAt: null,
    suspendReason: null,
    features: {
      hr: true,
      inventory: true,
      crm: true,
      purchasing: true,
      projects: true,
      chat: true,
      reporting: true,
    },
    modules: ['pos', 'inventory', 'crm', 'purchasing', 'hr', 'projects', 'reporting', 'chat'],
  },
  {
    nameEn: 'Beta Tech',
    nameAr: 'بيتا للتقنية',
    status: 'active',
    planId: 2,
    billingCycle: 'monthly',
    trialEndsAt: null,
    suspendedAt: null,
    cancelledAt: null,
    suspendReason: null,
    features: { hr: true, inventory: true, crm: true, purchasing: true },
    modules: ['pos', 'inventory', 'crm', 'purchasing', 'hr'],
  },
  {
    nameEn: 'Gamma Restaurant',
    nameAr: 'جاما للمطاعم',
    status: 'active',
    planId: 2,
    billingCycle: 'monthly',
    trialEndsAt: null,
    suspendedAt: null,
    cancelledAt: null,
    suspendReason: null,
    features: { inventory: true, pos: true },
    modules: ['pos', 'inventory'],
  },
  {
    nameEn: 'Delta Retail',
    nameAr: 'دلتا للتجزئة',
    status: 'active',
    planId: 1,
    billingCycle: 'monthly',
    trialEndsAt: null,
    suspendedAt: null,
    cancelledAt: null,
    suspendReason: null,
    features: { pos: true, inventory: true },
    modules: ['pos', 'inventory'],
  },
  {
    nameEn: 'Epsilon Services',
    nameAr: 'إبسيلون للخدمات',
    status: 'trial',
    planId: 4,
    billingCycle: 'monthly',
    trialEndsAt: new Date('2026-03-28'),
    suspendedAt: null,
    cancelledAt: null,
    suspendReason: null,
    features: {
      hr: true,
      inventory: true,
      crm: true,
      purchasing: true,
      projects: true,
      chat: true,
      reporting: true,
    },
    modules: ['pos', 'inventory', 'crm', 'purchasing', 'hr', 'projects', 'reporting', 'chat'],
  },
  {
    nameEn: 'Zeta Construction',
    nameAr: 'زيتا للبناء',
    status: 'suspended',
    planId: 2,
    billingCycle: 'monthly',
    trialEndsAt: null,
    suspendedAt: new Date('2026-02-15'),
    cancelledAt: null,
    suspendReason: 'Payment overdue for 30+ days',
    features: { hr: true, inventory: true, crm: true, purchasing: true },
    modules: ['pos', 'inventory', 'crm', 'purchasing', 'hr'],
  },
  {
    nameEn: 'Eta Healthcare',
    nameAr: 'إيتا للرعاية الصحية',
    status: 'active',
    planId: 3,
    billingCycle: 'annual',
    trialEndsAt: null,
    suspendedAt: null,
    cancelledAt: null,
    suspendReason: null,
    features: {
      hr: true,
      inventory: true,
      crm: true,
      purchasing: true,
      projects: true,
      chat: true,
      reporting: true,
    },
    modules: ['pos', 'inventory', 'crm', 'purchasing', 'hr', 'projects', 'reporting', 'chat'],
  },
  {
    nameEn: 'Theta Education',
    nameAr: 'ثيتا للتعليم',
    status: 'cancelled',
    planId: 1,
    billingCycle: 'monthly',
    trialEndsAt: null,
    suspendedAt: null,
    cancelledAt: new Date('2026-02-01'),
    suspendReason: null,
    features: { pos: true, inventory: true },
    modules: ['pos', 'inventory'],
  },
  {
    nameEn: 'Iota Logistics',
    nameAr: 'أيوتا للوجستيات',
    status: 'active',
    planId: 2,
    billingCycle: 'quarterly',
    trialEndsAt: null,
    suspendedAt: null,
    cancelledAt: null,
    suspendReason: null,
    features: { hr: true, inventory: true, crm: true, purchasing: true },
    modules: ['pos', 'inventory', 'crm', 'purchasing', 'hr'],
  },
];

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();

  // ── Tenants ─────────────────────────────────────────────────────────────────
  const tenantRows = tenantDefs.map((def, i) => ({
    id: TENANT_IDS[i],
    nameEn: def.nameEn,
    nameAr: def.nameAr,
    slug: TENANT_SLUGS[i],
    status: def.status,
    trialEndsAt: def.trialEndsAt,
    suspendedAt: def.suspendedAt,
    suspendReason: def.suspendReason,
    cancelledAt: def.cancelledAt,
    settings: JSON.stringify({
      fiscalYearStartMonth: 1,
      defaultCurrency: 'SAR',
      salaryCalculation: 'actual_days',
      timezone: 'Asia/Riyadh',
    }),
    features: JSON.stringify(def.features),
    createdBy: null,
    updatedBy: null,
    version: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }));
  await qi.bulkInsert('tenants', tenantRows);

  // ── Subscriptions ───────────────────────────────────────────────────────────
  const subscriptionStatusMap: Record<string, string> = {
    active: 'active',
    trial: 'trial',
    suspended: 'suspended',
    cancelled: 'cancelled',
  };

  const subscriptionRows = tenantDefs.map((def, i) => ({
    id: SUBSCRIPTION_IDS[i],
    tenantId: TENANT_IDS[i],
    planId: def.planId,
    status: subscriptionStatusMap[def.status] ?? 'active',
    billingCycle: def.billingCycle,
    trialEndsAt: def.trialEndsAt,
    currentPeriodStart: new Date('2026-01-01'),
    currentPeriodEnd:
      def.billingCycle === 'annual' ? new Date('2026-12-31') : new Date('2026-03-31'),
    cancelledAt: def.cancelledAt,
    autoRenewal: def.status !== 'cancelled',
    createdBy: null,
    updatedBy: null,
    version: 0,
    createdAt: now,
    updatedAt: now,
  }));
  await qi.bulkInsert('subscriptions', subscriptionRows);

  // ── Tenant Metrics (4 monthly snapshots per tenant = 40 records) ────────────
  const metricMonths = [
    {
      date: new Date('2025-12-31'),
      baseUsers: 5,
      baseApi: 15000,
      baseStorage: 80,
      baseRecords: 800,
    },
    {
      date: new Date('2026-01-31'),
      baseUsers: 8,
      baseApi: 30000,
      baseStorage: 160,
      baseRecords: 2000,
    },
    {
      date: new Date('2026-02-28'),
      baseUsers: 12,
      baseApi: 50000,
      baseStorage: 280,
      baseRecords: 3800,
    },
    {
      date: new Date('2026-03-13'),
      baseUsers: 15,
      baseApi: 65000,
      baseStorage: 350,
      baseRecords: 5200,
    },
  ];

  const metricRows: Array<Record<string, unknown>> = [];
  for (let t = 0; t < TENANT_IDS.length; t++) {
    const multiplier = 0.5 + Math.random() * 1.5; // vary per tenant
    for (let m = 0; m < metricMonths.length; m++) {
      const mm = metricMonths[m];
      metricRows.push({
        id: uuidv7(),
        tenantSlug: TENANT_SLUGS[t],
        metricDate: mm.date,
        activeUsers: Math.round(mm.baseUsers * multiplier),
        apiCallsTotal: Math.round(mm.baseApi * multiplier),
        storageUsedMb: +(mm.baseStorage * multiplier).toFixed(1),
        recordsTotal: Math.round(mm.baseRecords * multiplier),
        createdBy: null,
        updatedBy: null,
        version: 0,
        createdAt: now,
      });
    }
  }
  await qi.bulkInsert('tenant_metrics', metricRows);

  // ── Tenant Onboarding (1 per tenant = 10 records) ──────────────────────────
  const onboardingRows = TENANT_SLUGS.map((slug, i) => {
    const isComplete = i < 5; // first 5 completed
    return {
      id: uuidv7(),
      tenantSlug: slug,
      logoUploaded: isComplete,
      firstUserCreated: true,
      firstEmployeeAdded: isComplete || i < 7,
      firstProductAdded: isComplete || i < 8,
      firstInvoiceCreated: isComplete,
      completedAt: isComplete ? now : null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
  });
  await qi.bulkInsert('tenant_onboarding', onboardingRows);

  // ── Tenant Notes (3-5 per tenant = ~40 notes) ──────────────────────────────
  const noteTemplates = [
    { content: 'Initial setup completed. All modules configured.', priority: 'normal' },
    {
      content: 'Customer requested additional training session for POS module.',
      priority: 'normal',
    },
    {
      content: 'ZATCA integration pending — awaiting API credentials from client.',
      priority: 'high',
    },
    { content: 'Accounting module configured. Chart of accounts imported.', priority: 'normal' },
    {
      content: 'Loyalty program launched successfully. Customers being enrolled.',
      priority: 'low',
    },
    {
      content: 'Payment method update requested — switching from Moyasar to Tap.',
      priority: 'high',
    },
    {
      content: 'Data migration from legacy system in progress. Expected 2 more weeks.',
      priority: 'high',
    },
    { content: 'User reported slow POS terminal response. Under investigation.', priority: 'high' },
    { content: 'Annual contract renewal discussion scheduled for next month.', priority: 'normal' },
    { content: 'Custom report template requested for monthly sales analysis.', priority: 'normal' },
  ];

  const noteRows: Array<Record<string, unknown>> = [];
  for (let t = 0; t < TENANT_IDS.length; t++) {
    const notesPerTenant = 3 + (t % 3); // 3, 4, or 5 notes
    for (let n = 0; n < notesPerTenant; n++) {
      const template = noteTemplates[(t * 3 + n) % noteTemplates.length];
      noteRows.push({
        id: uuidv7(),
        tenantId: TENANT_IDS[t],
        content: template.content,
        priority: template.priority,
        linkedTicketId: null,
        createdByName: n % 2 === 0 ? 'Admin User' : 'Support Agent',
        createdBy: null,
        updatedBy: null,
        version: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
    }
  }
  await qi.bulkInsert('tenant_notes', noteRows);

  // ── Payment Transactions (2-3 per tenant = ~25 records) ────────────────────
  const paymentRows: Array<Record<string, unknown>> = [];
  const planPrices: Record<number, number> = { 1: 0, 2: 2990, 3: 5990, 4: 0 };

  for (let t = 0; t < TENANT_IDS.length; t++) {
    const price = planPrices[tenantDefs[t].planId] ?? 299;
    if (price === 0) continue; // skip free plans

    // Successful payment
    paymentRows.push({
      id: uuidv7(),
      subscriptionId: SUBSCRIPTION_IDS[t],
      tenantId: TENANT_IDS[t],
      amount: price,
      currency: 'SAR',
      status: 'completed',
      provider: 'moyasar',
      providerTransactionId: `pi_${uuidv7().replace(/-/g, '').substring(0, 24)}`,
      providerResponse: JSON.stringify({ status: 'succeeded', paidAt: '2026-01-01T10:30:00Z' }),
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: new Date('2026-01-01T10:30:00Z'),
      updatedAt: new Date('2026-01-01T10:30:00Z'),
    });

    // Previous year payment
    paymentRows.push({
      id: uuidv7(),
      subscriptionId: SUBSCRIPTION_IDS[t],
      tenantId: TENANT_IDS[t],
      amount: price,
      currency: 'SAR',
      status: 'completed',
      provider: 'moyasar',
      providerTransactionId: `pi_${uuidv7().replace(/-/g, '').substring(0, 24)}`,
      providerResponse: JSON.stringify({ status: 'succeeded', paidAt: '2025-01-01T09:15:00Z' }),
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: new Date('2025-01-01T09:15:00Z'),
      updatedAt: new Date('2025-01-01T09:15:00Z'),
    });

    // Failed payment for suspended tenant
    if (tenantDefs[t].status === 'suspended') {
      paymentRows.push({
        id: uuidv7(),
        subscriptionId: SUBSCRIPTION_IDS[t],
        tenantId: TENANT_IDS[t],
        amount: price,
        currency: 'SAR',
        status: 'failed',
        provider: 'moyasar',
        providerTransactionId: `pi_${uuidv7().replace(/-/g, '').substring(0, 24)}`,
        providerResponse: JSON.stringify({
          status: 'failed',
          failureReason: 'insufficient_funds',
          attemptedAt: '2026-02-10T14:00:00Z',
        }),
        createdBy: null,
        updatedBy: null,
        version: 0,
        createdAt: new Date('2026-02-10T14:00:00Z'),
        updatedAt: new Date('2026-02-10T14:00:00Z'),
      });
    }
  }
  await qi.bulkInsert('payment_transactions', paymentRows);

  console.log(
    `[02-demo-tenant] Seeded ${TENANT_IDS.length} tenants, ${SUBSCRIPTION_IDS.length} subscriptions, ` +
      `${metricRows.length} tenant_metrics, ${onboardingRows.length} tenant_onboarding, ` +
      `${noteRows.length} tenant_notes, ${paymentRows.length} payment_transactions.`,
  );
}

// Re-export IDs for downstream seeders
export { TENANT_IDS, TENANT_SLUGS, SUBSCRIPTION_IDS };
