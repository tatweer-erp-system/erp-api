export interface DataExportResult {
  url: string;
  expiresAt: Date;
}

export interface ConsentRecord {
  consentType: ConsentType;
  granted: boolean;
  ipAddress: string;
  userAgent: string;
}

export type ConsentType =
  | 'marketing_email'
  | 'sms_notifications'
  | 'data_analytics'
  | 'third_party_sharing';

export interface AnonymizationResult {
  userId: string;
  fieldsAnonymized: string[];
  completedAt: Date;
}
