export interface OutboxEventPayload {
  id: string;
  tenant_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  last_error: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface IEventHandler {
  handle(event: OutboxEventPayload): Promise<void>;
}
