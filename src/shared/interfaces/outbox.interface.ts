export interface OutboxEventPayload {
  tenantSlug: string;
  eventType: 'SEND_EMAIL' | 'SEND_FCM' | 'SEND_SMS' | string;
  payload: Record<string, unknown>;
  /** @deprecated transactions are no longer passed through outbox events */
  transaction?: unknown;
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
