export interface NotificationPayload {
  userId: string;
  tenantSlug: string;
  eventType: string;
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
  data?: Record<string, unknown>;
  channels?: ('push' | 'email' | 'sms' | 'in_app')[];
  sendAt?: Date;
}

export interface NotificationChannel {
  type: 'push' | 'email' | 'sms' | 'in_app';
  enabled: boolean;
}

export interface BulkPreferenceUpdate {
  eventType: string;
  channel: 'push' | 'email' | 'sms' | 'in_app';
  enabled: boolean;
}
