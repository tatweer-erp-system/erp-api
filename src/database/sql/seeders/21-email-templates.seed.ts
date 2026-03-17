import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';

const TENANT_ID = '10000000-0000-0000-0000-000000000001';

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();

  await qi.bulkInsert('email_templates', [
    // ── Invoice Sent ────────────────────────────────────────────────────────
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      nameEn: 'Invoice Sent',
      nameAr: 'إرسال فاتورة',
      model: 'invoice',
      subject: 'Invoice {{invoiceNumber}} from {{companyName}}',
      bodyEn:
        '<p>Dear {{customerName}},</p><p>Please find attached your invoice <strong>{{invoiceNumber}}</strong> for the amount of <strong>{{totalAmount}} {{currency}}</strong>.</p><p>Payment is due by <strong>{{dueDate}}</strong>.</p><p>Thank you for your business.</p><p>Best regards,<br/>{{companyName}}</p>',
      bodyAr:
        '<p>عزيزي/عزيزتي {{customerName}}،</p><p>مرفق فاتورتكم رقم <strong>{{invoiceNumber}}</strong> بمبلغ <strong>{{totalAmount}} {{currency}}</strong>.</p><p>موعد الاستحقاق: <strong>{{dueDate}}</strong>.</p><p>شكراً لتعاملكم معنا.</p><p>مع أطيب التحيات،<br/>{{companyName}}</p>',
      fromEmail: null,
      replyTo: null,
      autoAttachPdf: true,
      ccEmails: null,
      isDefault: true,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // ── Payment Receipt ─────────────────────────────────────────────────────
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      nameEn: 'Payment Receipt',
      nameAr: 'إيصال دفع',
      model: 'payment',
      subject: 'Payment Receipt #{{receiptNumber}}',
      bodyEn:
        '<p>Dear {{customerName}},</p><p>We confirm receipt of your payment of <strong>{{amount}} {{currency}}</strong> on <strong>{{paymentDate}}</strong>.</p><p>Payment method: {{paymentMethod}}</p><p>Reference: {{referenceNumber}}</p><p>Thank you.</p><p>Best regards,<br/>{{companyName}}</p>',
      bodyAr:
        '<p>عزيزي/عزيزتي {{customerName}}،</p><p>نؤكد استلام دفعتكم بمبلغ <strong>{{amount}} {{currency}}</strong> بتاريخ <strong>{{paymentDate}}</strong>.</p><p>طريقة الدفع: {{paymentMethod}}</p><p>المرجع: {{referenceNumber}}</p><p>شكراً لكم.</p><p>مع أطيب التحيات،<br/>{{companyName}}</p>',
      fromEmail: null,
      replyTo: null,
      autoAttachPdf: false,
      ccEmails: null,
      isDefault: true,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // ── Order Confirmation ──────────────────────────────────────────────────
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      nameEn: 'Order Confirmation',
      nameAr: 'تأكيد الطلب',
      model: 'sales_order',
      subject: 'Order Confirmation {{orderNumber}}',
      bodyEn:
        '<p>Dear {{customerName}},</p><p>Thank you for your order <strong>{{orderNumber}}</strong>.</p><p>Order total: <strong>{{totalAmount}} {{currency}}</strong></p><p>We will process your order shortly.</p><p>Best regards,<br/>{{companyName}}</p>',
      bodyAr:
        '<p>عزيزي/عزيزتي {{customerName}}،</p><p>شكراً لطلبكم رقم <strong>{{orderNumber}}</strong>.</p><p>إجمالي الطلب: <strong>{{totalAmount}} {{currency}}</strong></p><p>سنقوم بمعالجة طلبكم قريباً.</p><p>مع أطيب التحيات،<br/>{{companyName}}</p>',
      fromEmail: null,
      replyTo: null,
      autoAttachPdf: true,
      ccEmails: null,
      isDefault: true,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // ── RFQ Sent ────────────────────────────────────────────────────────────
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      nameEn: 'RFQ Sent',
      nameAr: 'إرسال طلب عرض أسعار',
      model: 'purchase_order',
      subject: 'Request for Quotation {{rfqNumber}} from {{companyName}}',
      bodyEn:
        '<p>Dear {{supplierName}},</p><p>We would like to request a quotation for the items listed in the attached document (Ref: <strong>{{rfqNumber}}</strong>).</p><p>Please provide your best prices and delivery timeline by <strong>{{deadlineDate}}</strong>.</p><p>Best regards,<br/>{{companyName}}</p>',
      bodyAr:
        '<p>عزيزي/عزيزتي {{supplierName}}،</p><p>نود طلب عرض أسعار للأصناف المذكورة في المستند المرفق (المرجع: <strong>{{rfqNumber}}</strong>).</p><p>يرجى تزويدنا بأفضل الأسعار ومواعيد التسليم قبل <strong>{{deadlineDate}}</strong>.</p><p>مع أطيب التحيات،<br/>{{companyName}}</p>',
      fromEmail: null,
      replyTo: null,
      autoAttachPdf: true,
      ccEmails: null,
      isDefault: true,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // ── Leave Approved ──────────────────────────────────────────────────────
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      nameEn: 'Leave Approved',
      nameAr: 'تمت الموافقة على الإجازة',
      model: 'leave',
      subject: 'Leave Request Approved - {{leaveType}}',
      bodyEn:
        '<p>Dear {{employeeName}},</p><p>Your <strong>{{leaveType}}</strong> request from <strong>{{startDate}}</strong> to <strong>{{endDate}}</strong> ({{totalDays}} days) has been <strong>approved</strong>.</p><p>Approved by: {{approverName}}</p><p>Enjoy your time off!</p><p>Best regards,<br/>HR Department</p>',
      bodyAr:
        '<p>عزيزي/عزيزتي {{employeeName}}،</p><p>تمت الموافقة على طلب إجازتكم (<strong>{{leaveType}}</strong>) من <strong>{{startDate}}</strong> إلى <strong>{{endDate}}</strong> ({{totalDays}} أيام).</p><p>تمت الموافقة بواسطة: {{approverName}}</p><p>نتمنى لكم وقتاً ممتعاً!</p><p>مع أطيب التحيات،<br/>قسم الموارد البشرية</p>',
      fromEmail: null,
      replyTo: null,
      autoAttachPdf: false,
      ccEmails: null,
      isDefault: true,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // ── Payslip Sent ────────────────────────────────────────────────────────
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      nameEn: 'Payslip Sent',
      nameAr: 'إرسال كشف الراتب',
      model: 'payslip',
      subject: 'Payslip for {{periodName}} - {{companyName}}',
      bodyEn:
        '<p>Dear {{employeeName}},</p><p>Your payslip for the period <strong>{{periodName}}</strong> is now available.</p><p>Net salary: <strong>{{netAmount}} SAR</strong></p><p>Please find the details in the attached PDF.</p><p>Best regards,<br/>{{companyName}}</p>',
      bodyAr:
        '<p>عزيزي/عزيزتي {{employeeName}}،</p><p>كشف راتبكم عن فترة <strong>{{periodName}}</strong> متاح الآن.</p><p>صافي الراتب: <strong>{{netAmount}} ر.س</strong></p><p>يرجى الاطلاع على التفاصيل في المرفق.</p><p>مع أطيب التحيات،<br/>{{companyName}}</p>',
      fromEmail: null,
      replyTo: null,
      autoAttachPdf: true,
      ccEmails: null,
      isDefault: true,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // ── Ticket Received ─────────────────────────────────────────────────────
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      nameEn: 'Ticket Received',
      nameAr: 'تم استلام التذكرة',
      model: 'ticket',
      subject: 'Support Ticket #{{ticketNumber}} Received',
      bodyEn:
        '<p>Dear {{customerName}},</p><p>We have received your support ticket <strong>#{{ticketNumber}}</strong>.</p><p>Subject: {{ticketSubject}}</p><p>Our team will review your request and respond within 24 hours.</p><p>Best regards,<br/>Support Team</p>',
      bodyAr:
        '<p>عزيزي/عزيزتي {{customerName}}،</p><p>تم استلام تذكرة الدعم الخاصة بكم <strong>#{{ticketNumber}}</strong>.</p><p>الموضوع: {{ticketSubject}}</p><p>سيقوم فريقنا بمراجعة طلبكم والرد خلال 24 ساعة.</p><p>مع أطيب التحيات،<br/>فريق الدعم</p>',
      fromEmail: null,
      replyTo: null,
      autoAttachPdf: false,
      ccEmails: null,
      isDefault: true,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // ── Welcome Email ───────────────────────────────────────────────────────
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      nameEn: 'Welcome Email',
      nameAr: 'بريد الترحيب',
      model: 'partner',
      subject: 'Welcome to {{companyName}}!',
      bodyEn:
        '<p>Dear {{partnerName}},</p><p>Welcome to <strong>{{companyName}}</strong>! We are delighted to have you as our partner.</p><p>Your account has been set up. Please do not hesitate to reach out if you need any assistance.</p><p>Best regards,<br/>{{companyName}}</p>',
      bodyAr:
        '<p>عزيزي/عزيزتي {{partnerName}}،</p><p>أهلاً بكم في <strong>{{companyName}}</strong>! يسعدنا أن نكون شركاءكم.</p><p>تم إعداد حسابكم. لا تتردد في التواصل معنا إذا احتجت أي مساعدة.</p><p>مع أطيب التحيات،<br/>{{companyName}}</p>',
      fromEmail: null,
      replyTo: null,
      autoAttachPdf: false,
      ccEmails: null,
      isDefault: false,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  console.log('[21-email-templates] Seeded 8 email templates.');
}
