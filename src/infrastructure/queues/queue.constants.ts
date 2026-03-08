export const QUEUE_MAIL = 'QUEUE_MAIL';
export const QUEUE_FCM = 'QUEUE_FCM';
export const QUEUE_SMS = 'QUEUE_SMS';
export const QUEUE_REPORTS = 'QUEUE_REPORTS';
export const QUEUE_INVENTORY = 'QUEUE_INVENTORY';

export const QUEUES = [QUEUE_MAIL, QUEUE_FCM, QUEUE_SMS, QUEUE_REPORTS, QUEUE_INVENTORY] as const;
export type QueueName = (typeof QUEUES)[number];
