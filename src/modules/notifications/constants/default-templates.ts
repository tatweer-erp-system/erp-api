import { NotificationChannel } from '@/common/enums/notification.enums';

export interface DefaultTemplate {
  eventType: string;
  channel: string;
  subjectEn: string;
  subjectAr: string;
  bodyEn: string;
  bodyAr: string;
}

export const DEFAULT_NOTIFICATION_TEMPLATES: DefaultTemplate[] = [
  {
    eventType: 'pos_checkout',
    channel: NotificationChannel.PUSH,
    subjectEn: 'Receipt for {{orderNumber}}',
    subjectAr: '\u0625\u064A\u0635\u0627\u0644 \u0644\u0644\u0637\u0644\u0628 {{orderNumber}}',
    bodyEn: 'Your order {{orderNumber}} total: {{totalAmount}}',
    bodyAr:
      '\u0637\u0644\u0628\u0643 {{orderNumber}} \u0627\u0644\u0645\u062C\u0645\u0648\u0639: {{totalAmount}}',
  },
  {
    eventType: 'pos_checkout',
    channel: NotificationChannel.EMAIL,
    subjectEn: 'Receipt for {{orderNumber}}',
    subjectAr: '\u0625\u064A\u0635\u0627\u0644 \u0644\u0644\u0637\u0644\u0628 {{orderNumber}}',
    bodyEn: 'Your order {{orderNumber}} total: {{totalAmount}}',
    bodyAr:
      '\u0637\u0644\u0628\u0643 {{orderNumber}} \u0627\u0644\u0645\u062C\u0645\u0648\u0639: {{totalAmount}}',
  },
  {
    eventType: 'loyalty_earn',
    channel: NotificationChannel.PUSH,
    subjectEn: 'Points earned',
    subjectAr: '\u0646\u0642\u0627\u0637 \u0645\u0643\u062A\u0633\u0628\u0629',
    bodyEn: 'You earned {{points}} points. Balance: {{balance}}',
    bodyAr:
      '\u0644\u0642\u062F \u0631\u0628\u062D\u062A {{points}} \u0646\u0642\u0637\u0629. \u0627\u0644\u0631\u0635\u064A\u062F: {{balance}}',
  },
  {
    eventType: 'loyalty_tier_upgrade',
    channel: NotificationChannel.PUSH,
    subjectEn: 'Tier upgrade!',
    subjectAr: '\u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0648\u0649!',
    bodyEn: 'Congratulations, you reached {{tierName}} tier',
    bodyAr:
      '\u062A\u0647\u0627\u0646\u064A\u0646\u0627\u060C \u0644\u0642\u062F \u0648\u0635\u0644\u062A \u0644\u0645\u0633\u062A\u0648\u0649 {{tierName}}',
  },
  {
    eventType: 'loyalty_tier_upgrade',
    channel: NotificationChannel.EMAIL,
    subjectEn: 'Tier upgrade!',
    subjectAr: '\u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0648\u0649!',
    bodyEn: 'Congratulations, you reached {{tierName}} tier',
    bodyAr:
      '\u062A\u0647\u0627\u0646\u064A\u0646\u0627\u060C \u0644\u0642\u062F \u0648\u0635\u0644\u062A \u0644\u0645\u0633\u062A\u0648\u0649 {{tierName}}',
  },
  {
    eventType: 'low_stock_alert',
    channel: NotificationChannel.IN_APP,
    subjectEn: 'Low stock: {{productNameEn}}',
    subjectAr: '\u0645\u062E\u0632\u0648\u0646 \u0645\u0646\u062E\u0641\u0636: {{productNameAr}}',
    bodyEn: 'Only {{currentQty}} units remaining',
    bodyAr:
      '\u0645\u062A\u0628\u0642\u064A {{currentQty}} \u0648\u062D\u062F\u0629 \u0641\u0642\u0637',
  },
  {
    eventType: 'contract_expiry_warning',
    channel: NotificationChannel.IN_APP,
    subjectEn: 'Contract expiring',
    subjectAr:
      '\u0627\u0644\u0639\u0642\u062F \u064A\u0646\u062A\u0647\u064A \u0642\u0631\u064A\u0628\u0627\u064B',
    bodyEn: 'Your contract expires in {{daysRemaining}} days',
    bodyAr:
      '\u0639\u0642\u062F\u0643 \u064A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 {{daysRemaining}} \u064A\u0648\u0645',
  },
  {
    eventType: 'contract_expiry_warning',
    channel: NotificationChannel.EMAIL,
    subjectEn: 'Contract expiring',
    subjectAr:
      '\u0627\u0644\u0639\u0642\u062F \u064A\u0646\u062A\u0647\u064A \u0642\u0631\u064A\u0628\u0627\u064B',
    bodyEn: 'Your contract expires in {{daysRemaining}} days',
    bodyAr:
      '\u0639\u0642\u062F\u0643 \u064A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 {{daysRemaining}} \u064A\u0648\u0645',
  },
  {
    eventType: 'purchase_order_due',
    channel: NotificationChannel.IN_APP,
    subjectEn: 'PO Due Tomorrow',
    subjectAr:
      '\u0623\u0645\u0631 \u0634\u0631\u0627\u0621 \u0645\u0633\u062A\u062D\u0642 \u063A\u062F\u0627\u064B',
    bodyEn: 'Purchase order {{orderNumber}} due tomorrow',
    bodyAr:
      '\u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 {{orderNumber}} \u0645\u0633\u062A\u062D\u0642 \u063A\u062F\u0627\u064B',
  },
  {
    eventType: 'lead_closing_soon',
    channel: NotificationChannel.IN_APP,
    subjectEn: 'Lead closing soon',
    subjectAr:
      '\u0641\u0631\u0635\u0629 \u062A\u0646\u062A\u0647\u064A \u0642\u0631\u064A\u0628\u0627\u064B',
    bodyEn: 'Lead "{{title}}" expected to close in {{daysRemaining}} days',
    bodyAr:
      '\u0627\u0644\u0641\u0631\u0635\u0629 "{{title}}" \u0645\u062A\u0648\u0642\u0639 \u0625\u063A\u0644\u0627\u0642\u0647\u0627 \u062E\u0644\u0627\u0644 {{daysRemaining}} \u064A\u0648\u0645',
  },
  {
    eventType: 'payroll_approved',
    channel: NotificationChannel.IN_APP,
    subjectEn: 'Payroll Approved',
    subjectAr:
      '\u062A\u0645\u062A \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0631\u0648\u0627\u062A\u0628',
    bodyEn: 'Your payroll for {{period}} has been approved',
    bodyAr:
      '\u062A\u0645\u062A \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0631\u0627\u062A\u0628\u0643 \u0644\u0641\u062A\u0631\u0629 {{period}}',
  },
];
