import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';

/**
 * System logs, notifications, tokens, and GDPR records.
 *
 * All references point to ACTUAL entities seeded by earlier seeders:
 *   - Users:    USER_1 (Ahmed/Manager), USER_2 (Sara/Cashier), USER_3 (Mohammed/Employee)
 *   - Products: PRODUCT_1 (Shawarma), PRODUCT_3 (Samsung Galaxy)
 *   - Orders:   ORDER_1 (POS takeaway), ORDER_2 (POS dine-in), SO_1 (Sales Order)
 *   - Session:  SESSION_1 (POS session, cashier Sara)
 *   - Contacts: CONTACT_1 (Khalid), CONTACT_2 (Fatima)
 */

// ── Cross-referenced IDs from previous seeders ────────────────────────────────
const TENANT_ID = '10000000-0000-4000-a000-000000000001';
const TENANT_SLUG = 'demo-company';
const ADMIN_ID = '00000000-0000-4000-a000-000000000001';
const USER_1_ID = '20000000-0000-4000-a000-000000000001'; // Ahmed — Manager
const USER_2_ID = '20000000-0000-4000-a000-000000000002'; // Sara — Cashier
const USER_3_ID = '20000000-0000-4000-a000-000000000003'; // Mohammed — Employee

const PRODUCT_1_ID = '71000000-0000-4000-a000-000000000001'; // Chicken Shawarma
const PRODUCT_3_ID = '71000000-0000-4000-a000-000000000003'; // Samsung Galaxy S24
const ORDER_1_ID = 'A3000000-0000-4000-a000-000000000001'; // POS takeaway order
const ORDER_2_ID = 'A3000000-0000-4000-a000-000000000002'; // POS dine-in order
const SO_1_ID = '83000000-0000-4000-a000-000000000001'; // Sales Order
const SESSION_1_ID = 'A2000000-0000-4000-a000-000000000001'; // POS session

const CONTACT_1_ID = '80000000-0000-4000-a000-000000000001'; // Khalid Al-Saud

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // ── audit_logs ──────────────────────────────────────────────────────────────
  // Story: Ahmed created the Shawarma product, then Sara updated Contact Khalid's phone.
  await qi.bulkInsert('audit_logs', [
    {
      id: uuidv7(),
      tenantSlug: TENANT_SLUG,
      userId: USER_1_ID,
      action: 'create',
      entity: 'products',
      entityId: PRODUCT_1_ID,
      oldValues: null,
      newValues: JSON.stringify({
        nameEn: 'Chicken Shawarma',
        nameAr: 'شاورما دجاج',
        sku: 'FOOD-001',
        unitPrice: 25,
        productType: 'consumable',
      }),
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
      requestId: uuidv7(),
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    {
      id: uuidv7(),
      tenantSlug: TENANT_SLUG,
      userId: USER_2_ID,
      action: 'update',
      entity: 'contacts',
      entityId: CONTACT_1_ID,
      oldValues: JSON.stringify({ phone: '+966551234560' }),
      newValues: JSON.stringify({ phone: '+966551234567' }),
      ipAddress: '192.168.1.11',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0',
      requestId: uuidv7(),
      createdBy: USER_2_ID,
      updatedBy: USER_2_ID,
      version: 0,
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: uuidv7(),
      tenantSlug: TENANT_SLUG,
      userId: USER_1_ID,
      action: 'status_change',
      entity: 'pos_orders',
      entityId: ORDER_1_ID,
      oldValues: JSON.stringify({ status: 'open' }),
      newValues: JSON.stringify({ status: 'paid' }),
      ipAddress: '192.168.1.11',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
      requestId: uuidv7(),
      createdBy: USER_2_ID,
      updatedBy: USER_2_ID,
      version: 0,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    },
  ]);

  // ── impersonation_logs ──────────────────────────────────────────────────────
  // Story: Super admin impersonated Ahmed to debug a POS session issue.
  const tokenExpires = new Date(oneHourAgo.getTime() + 60 * 60 * 1000);
  await qi.bulkInsert('impersonation_logs', [
    {
      id: uuidv7(),
      adminId: ADMIN_ID,
      targetUserId: USER_1_ID,
      tenantSlug: TENANT_SLUG,
      reason: `Investigating POS session ${SESSION_1_ID} — user reported cash drawer not opening`,
      ipAddress: '10.0.0.1',
      startedAt: oneHourAgo,
      tokenExpiresAt: tokenExpires,
      createdBy: ADMIN_ID,
      updatedBy: ADMIN_ID,
      version: 0,
    },
  ]);

  // ── admin_notifications ─────────────────────────────────────────────────────
  // Story: Admin notified when Demo Company signed up, and when subscription payment succeeded.
  await qi.bulkInsert('admin_notifications', [
    {
      id: uuidv7(),
      adminId: ADMIN_ID,
      type: 'tenant_signup',
      titleEn: 'New Tenant Registered',
      titleAr: 'تسجيل مستأجر جديد',
      bodyEn: 'Demo Company has signed up on the Enterprise plan.',
      bodyAr: 'تم تسجيل شركة تجريبية على الخطة المؤسسية.',
      data: JSON.stringify({ tenantSlug: TENANT_SLUG, plan: 'enterprise' }),
      isRead: true,
      readAt: twoDaysAgo,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
      deletedAt: null,
    },
    {
      id: uuidv7(),
      adminId: ADMIN_ID,
      type: 'payment_received',
      titleEn: 'Payment Received',
      titleAr: 'تم استلام الدفعة',
      bodyEn: 'Demo Company paid 4,999.99 SAR for annual Enterprise subscription.',
      bodyAr: 'دفعت الشركة التجريبية 4,999.99 ريال للاشتراك السنوي المؤسسي.',
      data: JSON.stringify({ tenantSlug: TENANT_SLUG, amount: 4999.99, currency: 'SAR' }),
      isRead: false,
      readAt: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: yesterday,
      updatedAt: yesterday,
      deletedAt: null,
    },
  ]);

  // ── security_events ─────────────────────────────────────────────────────────
  // Story: Ahmed logged in successfully. Sara changed her password.
  await qi.bulkInsert('security_events', [
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      eventType: 'login_success',
      userId: USER_1_ID,
      tenantSlug: TENANT_SLUG,
      ipAddress: '192.168.1.10',
      country: 'Saudi Arabia',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
      metadata: JSON.stringify({ method: 'password', mfaUsed: false }),
      createdBy: USER_1_ID,
      version: 0,
      createdAt: threeHoursAgo,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      eventType: 'login_success',
      userId: USER_2_ID,
      tenantSlug: TENANT_SLUG,
      ipAddress: '192.168.1.11',
      country: 'Saudi Arabia',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0',
      metadata: JSON.stringify({ method: 'password', mfaUsed: false }),
      createdBy: USER_2_ID,
      version: 0,
      createdAt: threeHoursAgo,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      eventType: 'password_change',
      userId: USER_2_ID,
      tenantSlug: TENANT_SLUG,
      ipAddress: '192.168.1.11',
      country: 'Saudi Arabia',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0',
      metadata: JSON.stringify({ initiatedBy: 'user', reason: 'periodic_reset' }),
      createdBy: USER_2_ID,
      version: 0,
      createdAt: yesterday,
    },
  ]);

  // ── notifications ───────────────────────────────────────────────────────────
  // Story: Ahmed got notified when POS order 1 completed, and when Samsung stock dropped below reorder point.
  await qi.bulkInsert('notifications', [
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      userId: USER_1_ID,
      type: 'order_completed',
      titleEn: 'Order Completed',
      titleAr: 'تم إكمال الطلب',
      bodyEn: 'POS order POS-00001 has been completed — total 74.75 SAR.',
      bodyAr: 'تم إكمال طلب نقاط البيع POS-00001 — المجموع 74.75 ريال.',
      data: JSON.stringify({ orderId: ORDER_1_ID, orderNumber: 'POS-00001', total: 74.75 }),
      isRead: true,
      readAt: oneHourAgo,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
      deletedAt: null,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      userId: USER_1_ID,
      type: 'low_stock',
      titleEn: 'Low Stock Alert',
      titleAr: 'تنبيه مخزون منخفض',
      bodyEn: 'Samsung Galaxy S24 stock in Main Warehouse is at 5 units (reorder point: 5).',
      bodyAr: 'مخزون سامسونج جالكسي S24 في المستودع الرئيسي عند 5 وحدات (نقطة إعادة الطلب: 5).',
      data: JSON.stringify({
        productId: PRODUCT_3_ID,
        productName: 'Samsung Galaxy S24',
        warehouseId: '40000000-0000-4000-a000-000000000001',
        remaining: 5,
        reorderPoint: 5,
      }),
      isRead: false,
      readAt: null,
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
      userId: USER_2_ID,
      type: 'leave_approved',
      titleEn: 'Leave Request Approved',
      titleAr: 'تمت الموافقة على طلب الإجازة',
      bodyEn: 'Your annual leave request for Mar 20-24 has been approved by Ahmed Al-Rashid.',
      bodyAr: 'تمت الموافقة على طلب إجازتك السنوية من 20-24 مارس بواسطة أحمد الراشد.',
      data: JSON.stringify({
        leaveId: '93000000-0000-4000-a000-000000000001',
        leaveType: 'annual',
        startDate: '2026-03-20',
        endDate: '2026-03-24',
        approvedBy: USER_1_ID,
      }),
      isRead: true,
      readAt: yesterday,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: yesterday,
      updatedAt: yesterday,
      deletedAt: null,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      userId: USER_1_ID,
      type: 'sales_order_confirmed',
      titleEn: 'Sales Order Confirmed',
      titleAr: 'تم تأكيد أمر البيع',
      bodyEn:
        'Sales order SO-MAIN-00001 for Khalid Al-Saud has been confirmed — total 12,072.70 SAR.',
      bodyAr: 'تم تأكيد أمر البيع SO-MAIN-00001 لخالد آل سعود — المجموع 12,072.70 ريال.',
      data: JSON.stringify({
        orderId: SO_1_ID,
        orderNumber: 'SO-MAIN-00001',
        contactId: CONTACT_1_ID,
        total: 12072.7,
      }),
      isRead: false,
      readAt: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // ── notification_preferences ────────────────────────────────────────────────
  // All 3 users have preferences set.
  await qi.bulkInsert('notification_preferences', [
    {
      tenantId: TENANT_ID,
      userId: USER_1_ID,
      tenantSlug: TENANT_SLUG,
      channel: 'email',
      eventType: 'order_completed',
      enabled: true,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      tenantId: TENANT_ID,
      userId: USER_1_ID,
      tenantSlug: TENANT_SLUG,
      channel: 'push',
      eventType: 'low_stock',
      enabled: true,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      tenantId: TENANT_ID,
      userId: USER_1_ID,
      tenantSlug: TENANT_SLUG,
      channel: 'sms',
      eventType: 'order_completed',
      enabled: false,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      tenantId: TENANT_ID,
      userId: USER_2_ID,
      tenantSlug: TENANT_SLUG,
      channel: 'push',
      eventType: 'leave_approved',
      enabled: true,
      createdBy: USER_2_ID,
      updatedBy: USER_2_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      tenantId: TENANT_ID,
      userId: USER_3_ID,
      tenantSlug: TENANT_SLUG,
      channel: 'email',
      eventType: 'order_completed',
      enabled: true,
      createdBy: USER_3_ID,
      updatedBy: USER_3_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // ── outbox_events ───────────────────────────────────────────────────────────
  // Story: ORDER_COMPLETED event for POS order 1 was processed. ORDER_COMPLETED for order 2 is pending.
  await qi.bulkInsert('outbox_events', [
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      tenantSlug: TENANT_SLUG,
      eventType: 'ORDER_COMPLETED',
      payload: JSON.stringify({
        orderId: ORDER_1_ID,
        orderNumber: 'POS-00001',
        total: 74.75,
        customerId: null,
        sessionId: SESSION_1_ID,
      }),
      status: 'processed',
      attempts: 1,
      lastError: null,
      processedAt: oneHourAgo,
      referenceId: ORDER_1_ID,
      referenceType: 'pos_orders',
      createdBy: USER_2_ID,
      updatedBy: USER_2_ID,
      version: 0,
      createdAt: oneHourAgo,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      tenantSlug: TENANT_SLUG,
      eventType: 'ORDER_COMPLETED',
      payload: JSON.stringify({
        orderId: ORDER_2_ID,
        orderNumber: 'POS-00002',
        total: 63.25,
        customerId: CONTACT_1_ID,
        sessionId: SESSION_1_ID,
      }),
      status: 'processed',
      attempts: 1,
      lastError: null,
      processedAt: now,
      referenceId: ORDER_2_ID,
      referenceType: 'pos_orders',
      createdBy: USER_2_ID,
      updatedBy: USER_2_ID,
      version: 0,
      createdAt: now,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      tenantSlug: TENANT_SLUG,
      eventType: 'SALES_ORDER_CONFIRMED',
      payload: JSON.stringify({
        orderId: SO_1_ID,
        orderNumber: 'SO-MAIN-00001',
        contactId: CONTACT_1_ID,
        total: 12072.7,
      }),
      status: 'pending',
      attempts: 0,
      lastError: null,
      processedAt: null,
      referenceId: SO_1_ID,
      referenceType: 'sales_orders',
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: now,
    },
  ]);

  // ── refresh_tokens ──────────────────────────────────────────────────────────
  // Active sessions for Ahmed and Sara.
  const family1 = uuidv7();
  const family2 = uuidv7();
  await qi.bulkInsert('refresh_tokens', [
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      userId: USER_1_ID,
      tenantSlug: TENANT_SLUG,
      tokenHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      family: family1,
      revoked: false,
      revokedAt: null,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
      createdBy: USER_1_ID,
      version: 0,
      createdAt: threeHoursAgo,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      userId: USER_2_ID,
      tenantSlug: TENANT_SLUG,
      tokenHash: 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5',
      family: family2,
      revoked: false,
      revokedAt: null,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: '192.168.1.11',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0',
      createdBy: USER_2_ID,
      version: 0,
      createdAt: threeHoursAgo,
    },
  ]);

  // ── user_fcm_tokens ─────────────────────────────────────────────────────────
  // Ahmed has Android, Sara has iOS.
  await qi.bulkInsert('user_fcm_tokens', [
    {
      tenantId: TENANT_ID,
      userId: USER_1_ID,
      token: 'dGVzdC1mY20tYWhtZWQtYW5kcm9pZC1zYW1zdW5nLWdhbGF4eS1zMjQtZGV2aWNl',
      deviceType: 'android',
      deviceId: 'samsung-galaxy-s24-ahmed-001',
      isActive: true,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      tenantId: TENANT_ID,
      userId: USER_2_ID,
      token: 'dGVzdC1mY20tc2FyYS1pb3MtaXBob25lLTE1LXByby1kZXZpY2UtdG9rZW4',
      deviceType: 'ios',
      deviceId: 'iphone-15-pro-sara-001',
      isActive: true,
      createdBy: USER_2_ID,
      updatedBy: USER_2_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // ── api_keys ────────────────────────────────────────────────────────────────
  // POS integration key created by admin for this tenant.
  await qi.bulkInsert('api_keys', [
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      tenantSlug: TENANT_SLUG,
      name: 'POS Integration Key',
      keyHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      scopes: JSON.stringify(['pos:read', 'pos:create', 'inventory:read']),
      isActive: true,
      lastUsedAt: oneHourAgo,
      expiresAt: new Date('2027-12-31'),
      createdBy: ADMIN_ID,
      updatedBy: ADMIN_ID,
      version: 0,
      createdAt: twoDaysAgo,
      updatedAt: now,
    },
  ]);

  // ── consent_records ─────────────────────────────────────────────────────────
  // All 3 users granted marketing consent. Ahmed also granted analytics.
  await qi.bulkInsert('consent_records', [
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      userId: USER_1_ID,
      consentType: 'marketing',
      granted: true,
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
      grantedAt: twoDaysAgo,
      revokedAt: null,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      userId: USER_1_ID,
      consentType: 'analytics',
      granted: true,
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
      grantedAt: twoDaysAgo,
      revokedAt: null,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      userId: USER_2_ID,
      consentType: 'marketing',
      granted: true,
      ipAddress: '192.168.1.11',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0',
      grantedAt: twoDaysAgo,
      revokedAt: null,
      createdBy: USER_2_ID,
      updatedBy: USER_2_ID,
      version: 0,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      userId: USER_3_ID,
      consentType: 'marketing',
      granted: false,
      ipAddress: '192.168.1.12',
      userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0',
      grantedAt: twoDaysAgo,
      revokedAt: twoDaysAgo,
      createdBy: USER_3_ID,
      updatedBy: USER_3_ID,
      version: 0,
    },
  ]);

  // ── erasure_requests ────────────────────────────────────────────────────────
  // Mohammed (non-Saudi IT specialist) requested data erasure — pending review.
  await qi.bulkInsert('erasure_requests', [
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      userId: USER_3_ID,
      requestedAt: yesterday,
      status: 'pending',
      reason: 'Employee leaving the company — requested full data erasure per company policy.',
      processedAt: null,
      processedBy: null,
      createdBy: USER_3_ID,
      updatedBy: USER_3_ID,
      version: 0,
      createdAt: yesterday,
      updatedAt: yesterday,
    },
  ]);

  // ── retention_logs ──────────────────────────────────────────────────────────
  // Automatic purge of old audit logs from 90+ days ago.
  await qi.bulkInsert('retention_logs', [
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      tenantSlug: TENANT_SLUG,
      dataType: 'audit_logs',
      recordsPurged: 342,
      purgedAt: yesterday,
      createdBy: null,
      updatedBy: null,
      version: 0,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      tenantSlug: TENANT_SLUG,
      dataType: 'security_events',
      recordsPurged: 128,
      purgedAt: yesterday,
      createdBy: null,
      updatedBy: null,
      version: 0,
    },
  ]);

  console.log(
    '[15-system-logs] Seeded 3 audit_logs, 1 impersonation_log, 2 admin_notifications, ' +
      '3 security_events, 4 notifications, 5 notification_preferences, 3 outbox_events, ' +
      '2 refresh_tokens, 2 user_fcm_tokens, 1 api_key, 4 consent_records, ' +
      '1 erasure_request, 2 retention_logs.',
  );
}
