export interface NotificationPayload {
  userId: string;
  tenantSlug: string;
  eventType: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
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

export interface FcmJobData {
  tenantSlug: string;
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface SmsJobData {
  to: string;
  message: string;
}
