// Re-export domain enums for backwards compatibility.
// Prefer importing from the domain-specific enum file directly.
export { LeadStatus } from './crm.enums';
export { LeaveStatus } from './hr.enums';
export { TaskStatus, ProjectStatus } from './project.enums';
export { StockMovementType } from './inventory.enums';
export { TenantStatus } from './tenant.enums';
export { SubscriptionStatus, BillingCycle } from './subscription.enums';

export enum CommonStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum ApprovalStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  SENT = 'sent',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum OrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}
