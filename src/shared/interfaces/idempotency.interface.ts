export interface IdempotencyCacheEntry {
  key: string;
  tenantSlug: string;
  userId: string;
  endpoint: string;
  response: unknown;
  createdAt: string;
  expiresAt: string;
}

export interface IdempotencyCheckResult {
  exists: boolean;
  response?: unknown;
  inFlight?: boolean;
}
