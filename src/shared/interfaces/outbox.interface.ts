import { Transaction } from 'sequelize';

export interface OutboxEventPayload {
  tenantSlug: string;
  eventType: 'SEND_EMAIL' | 'SEND_FCM' | 'SEND_SMS' | string;
  payload: Record<string, unknown>;
  transaction: Transaction;
}

export interface OutboxEvent {
  id: string;
  tenantSlug: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processed' | 'failed';
  attempts: number;
  lastError: string | null;
  processedAt: Date | null;
  createdAt: Date;
}
