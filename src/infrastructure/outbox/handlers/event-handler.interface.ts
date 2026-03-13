export interface OutboxEventPayload {
  id: string;
  tenantId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  lastError: string | null;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
}

export interface IEventHandler {
  handle(event: OutboxEventPayload): Promise<void>;
}
