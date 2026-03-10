export const QUEUE_MAIL = 'erp:mail';
export const QUEUE_FCM = 'erp:fcm';
export const QUEUE_SMS = 'erp:sms';
export const QUEUE_PAYROLL = 'erp:payroll';
export const QUEUE_INVOICES = 'erp:invoices';
export const QUEUE_REPORTS = 'erp:reports';
export const QUEUE_INVENTORY = 'erp:inventory';

export const QUEUES = [
  QUEUE_MAIL,
  QUEUE_FCM,
  QUEUE_SMS,
  QUEUE_PAYROLL,
  QUEUE_INVOICES,
  QUEUE_REPORTS,
  QUEUE_INVENTORY,
] as const;
export type QueueName = (typeof QUEUES)[number];
