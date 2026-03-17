import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';

const TENANT_IDS = [
  '10000000-0000-4000-a000-000000000001',
  '10000000-0000-4000-a000-000000000002',
  '10000000-0000-4000-a000-000000000003',
  '10000000-0000-4000-a000-000000000004',
  '10000000-0000-4000-a000-000000000005',
  '10000000-0000-4000-a000-000000000006',
  '10000000-0000-4000-a000-000000000007',
  '10000000-0000-4000-a000-000000000008',
  '10000000-0000-4000-a000-000000000009',
  '10000000-0000-4000-a000-000000000010',
];

const TENANT_NAMES = [
  'Demo Company',
  'Alpha Trading',
  'Beta Tech',
  'Gamma Restaurant',
  'Delta Retail',
  'Epsilon Services',
  'Zeta Construction',
  'Eta Healthcare',
  'Theta Education',
  'Iota Logistics',
];

const ADMIN_IDS = Array.from(
  { length: 10 },
  (_, i) => `00000000-0000-4000-a000-0000000000${String(i + 2).padStart(2, '0')}`,
);
const ADMIN_NAMES = [
  'Fahad Al-Otaibi',
  'Noura Al-Zahrani',
  'Tariq Al-Ghamdi',
  'Huda Al-Qahtani',
  'Sultan Al-Shehri',
  'Lama Al-Mutairi',
  'Nawaf Al-Harbi',
  'Reema Al-Dosari',
  'Badr Al-Yami',
  'Dalal Al-Subaie',
];

interface TicketDef {
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdByName: string;
  replies: Array<{ senderType: 'agent' | 'client'; message: string; userName: string }>;
}

const ticketTemplates: TicketDef[] = [
  {
    subject: 'POS terminal not responding after update',
    description:
      'After the latest system update, our main POS terminal freezes intermittently. This happens every 20-30 minutes and requires a restart. Affecting daily sales operations.',
    status: 'in_progress',
    priority: 'critical',
    createdByName: 'Store Manager',
    replies: [
      {
        senderType: 'agent',
        message:
          'Thank you for reporting this. We are investigating the issue with the latest update. Could you share the terminal model and the exact version number?',
        userName: '',
      },
      {
        senderType: 'client',
        message:
          'Terminal is a Samsung Kiosk running version 2.4.1. The issue started immediately after the update.',
        userName: '',
      },
      {
        senderType: 'agent',
        message:
          'We have identified a memory leak in v2.4.1. A patch (v2.4.2) is being tested and will be deployed within 24 hours.',
        userName: '',
      },
    ],
  },
  {
    subject: 'Unable to generate ZATCA e-invoice',
    description:
      'When trying to generate a simplified tax invoice from the POS, we get an error: "ZATCA signing failed". This started happening yesterday and all invoices are affected.',
    status: 'open',
    priority: 'high',
    createdByName: 'Accountant',
    replies: [
      {
        senderType: 'agent',
        message:
          'We are looking into the ZATCA integration. Could you confirm if your ZATCA certificates are still valid?',
        userName: '',
      },
    ],
  },
  {
    subject: 'Request to add custom report for inventory aging',
    description:
      'We need a custom report that shows inventory aging by warehouse. The report should display products grouped by age buckets: 0-30, 31-60, 61-90, 90+ days.',
    status: 'resolved',
    priority: 'medium',
    createdByName: 'Warehouse Manager',
    replies: [
      {
        senderType: 'agent',
        message:
          'We can build this report for you. It will be available in the Reports module under Inventory section.',
        userName: '',
      },
      {
        senderType: 'client',
        message: 'That would be great. Can you also include the total value per age bucket?',
        userName: '',
      },
      {
        senderType: 'agent',
        message:
          'Done. The inventory aging report has been deployed and is now available in your Reports module.',
        userName: '',
      },
      {
        senderType: 'client',
        message: 'Confirmed. The report works perfectly. Thank you!',
        userName: '',
      },
    ],
  },
  {
    subject: 'Employee cannot clock in via mobile app',
    description:
      'Several employees are reporting that they cannot clock in through the mobile app. The app shows "Network Error" even though their internet connection is working fine.',
    status: 'in_progress',
    priority: 'high',
    createdByName: 'HR Manager',
    replies: [
      {
        senderType: 'agent',
        message:
          'We are checking the mobile API endpoints. Could you tell us which version of the mobile app your employees are using?',
        userName: '',
      },
      {
        senderType: 'client',
        message: 'Version 1.3.2 on both Android and iOS. About 8 employees are affected.',
        userName: '',
      },
    ],
  },
  {
    subject: 'Loyalty points not calculating correctly',
    description:
      'Customers are earning fewer loyalty points than expected. Our program is set to 1 point per SAR, but orders of 100 SAR are only earning 85 points. The discount amount seems to be deducted before point calculation.',
    status: 'closed',
    priority: 'medium',
    createdByName: 'Marketing Manager',
    replies: [
      {
        senderType: 'agent',
        message:
          'That is correct behavior. Loyalty points are calculated on the net amount after discount, not the gross subtotal. This follows the standard loyalty program rules.',
        userName: '',
      },
      {
        senderType: 'client',
        message:
          'I understand now. We thought it was on the subtotal before discount. Thank you for the clarification.',
        userName: '',
      },
    ],
  },
  {
    subject: 'Need to configure multi-currency for USD payments',
    description:
      'We have international clients who want to pay in USD. We need help configuring multi-currency support and setting up exchange rates.',
    status: 'resolved',
    priority: 'low',
    createdByName: 'Finance Manager',
    replies: [
      {
        senderType: 'agent',
        message:
          'Multi-currency is already supported. Go to Settings > Currencies to add USD and set the exchange rate. You can also enable automatic rate updates.',
        userName: '',
      },
      {
        senderType: 'client',
        message: 'Found it. We have configured USD with the current exchange rate. Thanks!',
        userName: '',
      },
    ],
  },
  {
    subject: 'Kitchen display not showing new orders',
    description:
      'The kitchen display screen stopped receiving new orders about an hour ago. Orders are being placed successfully in the POS but they do not appear on the kitchen display.',
    status: 'open',
    priority: 'critical',
    createdByName: 'Restaurant Manager',
    replies: [],
  },
  {
    subject: 'Payroll calculation discrepancy for overtime',
    description:
      'The February payroll shows incorrect overtime calculations for 3 employees. The system is calculating overtime at 1x rate instead of 1.5x as per our policy.',
    status: 'in_progress',
    priority: 'high',
    createdByName: 'HR Manager',
    replies: [
      {
        senderType: 'agent',
        message: 'Could you share the employee IDs and the expected vs actual overtime amounts?',
        userName: '',
      },
      {
        senderType: 'client',
        message:
          'Employee EMP-005, EMP-012, and EMP-018. For EMP-005: expected 2,250 SAR, actual 1,500 SAR for 10 overtime hours.',
        userName: '',
      },
      {
        senderType: 'agent',
        message:
          'We found the issue. The overtime multiplier was set to 1.0 instead of 1.5 in your tenant settings. Fixing now and recalculating.',
        userName: '',
      },
    ],
  },
  {
    subject: 'Request for API documentation for third-party integration',
    description:
      'We are building a custom dashboard and need access to the REST API documentation. Specifically, we need endpoints for sales reports, inventory levels, and customer data.',
    status: 'closed',
    priority: 'low',
    createdByName: 'CTO',
    replies: [
      {
        senderType: 'agent',
        message:
          'API documentation is available at /api/docs (Swagger). You can also generate an API key from Settings > API Keys for authentication.',
        userName: '',
      },
      {
        senderType: 'client',
        message:
          'Perfect, we found the documentation. The API key has been generated. Closing this ticket.',
        userName: '',
      },
    ],
  },
  {
    subject: 'Stock levels showing negative values',
    description:
      'Product SKU ELEC-001 (Samsung Galaxy S24) is showing -3 units in the Main Warehouse. Negative stock should not be allowed for storable products.',
    status: 'open',
    priority: 'high',
    createdByName: 'Inventory Manager',
    replies: [
      {
        senderType: 'agent',
        message:
          'This could happen if concurrent POS sales depleted stock before the check could block the sale. We are reviewing the stock reservation logic.',
        userName: '',
      },
    ],
  },
  {
    subject: 'Cannot export sales report to PDF',
    description:
      'When clicking the PDF export button on the monthly sales report, the download never starts. CSV export works fine.',
    status: 'resolved',
    priority: 'medium',
    createdByName: 'Sales Manager',
    replies: [
      {
        senderType: 'agent',
        message:
          'We have identified a bug in the PDF renderer for reports with more than 500 rows. A fix has been deployed.',
        userName: '',
      },
      { senderType: 'client', message: 'Confirmed working now. Thank you!', userName: '' },
    ],
  },
  {
    subject: 'Data migration from legacy POS system',
    description:
      'We need to migrate 3 years of historical sales data from our old POS system. The data is in CSV format, approximately 150,000 transactions.',
    status: 'in_progress',
    priority: 'medium',
    createdByName: 'Operations Manager',
    replies: [
      {
        senderType: 'agent',
        message:
          'We can handle the data migration. Please share a sample CSV file with column headers so we can prepare the import mapping.',
        userName: '',
      },
      {
        senderType: 'client',
        message:
          'Attached the sample file with 100 records. Columns are: date, product_code, quantity, unit_price, total, payment_method.',
        userName: '',
      },
    ],
  },
  {
    subject: 'Branch-level permissions not working correctly',
    description:
      'A cashier assigned to the East Branch can see orders from the Main Branch. Branch-level isolation should prevent cross-branch data access.',
    status: 'open',
    priority: 'high',
    createdByName: 'IT Administrator',
    replies: [],
  },
  {
    subject: 'Scheduled report emails not being delivered',
    description:
      'We configured daily sales summary reports to be emailed at 6 AM. The reports have not been delivered for the past 3 days.',
    status: 'resolved',
    priority: 'medium',
    createdByName: 'General Manager',
    replies: [
      {
        senderType: 'agent',
        message:
          'The email delivery service had a configuration issue. It has been fixed and your scheduled reports will resume from tomorrow.',
        userName: '',
      },
    ],
  },
  {
    subject: 'Gift card balance not updating after redemption',
    description:
      'A customer redeemed 50 SAR from gift card GC-100-001 but the balance still shows 100 SAR. The payment was processed correctly.',
    status: 'closed',
    priority: 'high',
    createdByName: 'Cashier Lead',
    replies: [
      {
        senderType: 'agent',
        message:
          'The gift card balance update was delayed due to a cache issue. We have cleared the cache and the balance now shows correctly as 50 SAR.',
        userName: '',
      },
      {
        senderType: 'client',
        message: 'Confirmed. Balance is correct now. Thanks for the quick fix!',
        userName: '',
      },
    ],
  },
];

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;

  const ticketRows: Array<Record<string, unknown>> = [];
  const replyRows: Array<Record<string, unknown>> = [];

  // Distribute tickets across tenants: ~2 per tenant, but vary the count
  for (let i = 0; i < ticketTemplates.length; i++) {
    const template = ticketTemplates[i];
    const tenantIdx = i % TENANT_IDS.length;
    const adminIdx = i % ADMIN_IDS.length;
    const ticketId = uuidv7();

    const createdDaysAgo = Math.floor(Math.random() * 14) + 1;
    const ticketCreatedAt = new Date(now.getTime() - createdDaysAgo * oneDay);

    ticketRows.push({
      id: ticketId,
      tenantId: TENANT_IDS[tenantIdx],
      subject: template.subject,
      description: template.description,
      status: template.status,
      priority: template.priority,
      tenantName: TENANT_NAMES[tenantIdx],
      createdByName: template.createdByName,
      assignedTo:
        template.status !== 'open' || template.replies.length > 0 ? ADMIN_IDS[adminIdx] : null,
      assignedToName:
        template.status !== 'open' || template.replies.length > 0 ? ADMIN_NAMES[adminIdx] : null,
      createdBy: null,
      updatedBy: null,
      version: template.replies.length,
      createdAt: ticketCreatedAt,
      updatedAt: now,
      deletedAt: null,
    });

    // Create replies
    for (let r = 0; r < template.replies.length; r++) {
      const reply = template.replies[r];
      const replyTime = new Date(ticketCreatedAt.getTime() + (r + 1) * 2 * 60 * 60 * 1000); // 2 hours apart
      replyRows.push({
        id: uuidv7(),
        tenantId: TENANT_IDS[tenantIdx],
        ticketId,
        userId: reply.senderType === 'agent' ? ADMIN_IDS[adminIdx] : null,
        userName: reply.senderType === 'agent' ? ADMIN_NAMES[adminIdx] : template.createdByName,
        senderType: reply.senderType,
        message: reply.message,
        createdBy: null,
        updatedBy: null,
        version: 0,
        createdAt: replyTime,
        updatedAt: replyTime,
      });
    }
  }

  await qi.bulkInsert('tickets', ticketRows);
  await qi.bulkInsert('ticket_replies', replyRows);

  console.log(
    `[16-tickets] Seeded ${ticketRows.length} tickets and ${replyRows.length} ticket replies across ${TENANT_IDS.length} tenants.`,
  );
}
