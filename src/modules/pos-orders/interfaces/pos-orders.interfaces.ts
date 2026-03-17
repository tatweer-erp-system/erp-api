export interface SyncResult {
  offlineId: string;
  status: 'synced' | 'already_synced' | 'failed';
  orderId?: string;
  failureReason?: string;
  warnings?: string[];
}
