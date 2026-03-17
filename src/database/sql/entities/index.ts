// Auth
export { Admin } from './admin.entity';
export { AdminNotification } from './admin-notification.entity';
export { Tenant } from './tenant.entity';
export { User } from './user.entity';
export { Branch } from './branch.entity';
export { UserFcmToken } from './user-fcm-token.entity';
export { RefreshToken } from './refresh-token.entity';
export { ApiKey } from './api-key.entity';

// RBAC
export { Role } from './role.entity';
export { Permission } from './permission.entity';
export { RolePermission } from './role-permission.entity';
export { UserRole } from './user-role.entity';

// Notifications
export { Notification } from './notification.entity';
export { NotificationPreference } from './notification-preference.entity';
export { NotificationTemplate } from './notification-template.entity';

// HR
export { Employee } from './employee.entity';
export { Department } from './department.entity';
export { LeaveRequest } from './leave-request.entity';
export { Shift } from './shift.entity';
export { AttendanceRecord } from './attendance-record.entity';
export { PayrollRun } from './payroll-run.entity';
export { PayrollItem } from './payroll-item.entity';
export { TrainingRecord } from './training-record.entity';
export { EmployeeContract } from './employee-contract.entity';

// Inventory
export { Product } from './product.entity';
export { ProductCategory } from './product-category.entity';
export { Warehouse } from './warehouse.entity';
export { StockLevel } from './stock-level.entity';
export { StockMovement } from './stock-movement.entity';

// CRM
export { Contact } from './contact.entity';
export { Lead } from './lead.entity';
export { LeadActivity } from './lead-activity.entity';
export { SalesOrder } from './sales-order.entity';
export { SalesOrderLine } from './sales-order-line.entity';

// Purchasing
export { Vendor } from './vendor.entity';
export { PurchaseOrder } from './purchase-order.entity';
export { PurchaseOrderLine } from './purchase-order-line.entity';

// Projects
export { Project } from './project.entity';
export { ProjectMember } from './project-member.entity';
export { Task } from './task.entity';
export { TaskTimeEntry } from './task-time-entry.entity';

// Subscriptions
export { Plan } from './plan.entity';
export { Subscription } from './subscription.entity';
export { PaymentTransaction } from './payment-transaction.entity';

// Sequences
export { Sequence } from './sequence.entity';

// POS
export { PosTerminal } from './pos-terminal.entity';
export { PosSession } from './pos-session.entity';
export { CashMovement } from './cash-movement.entity';
export { PosCashier } from './pos-cashier.entity';
export { ManagerOverride } from './manager-override.entity';
export { PosOrder } from './pos-order.entity';
export { PosOrderItem } from './pos-order-item.entity';
export { PosPayment } from './pos-payment.entity';
export { PosHeldOrder } from './pos-held-order.entity';
export { PosRefund } from './pos-refund.entity';

// Loyalty
export { LoyaltyProgram } from './loyalty-program.entity';
export { LoyaltyTier } from './loyalty-tier.entity';
export { LoyaltyAccount } from './loyalty-account.entity';
export { LoyaltyTransaction } from './loyalty-transaction.entity';

// Vouchers & Gift Cards
export { Voucher } from './voucher.entity';
export { VoucherRedemption } from './voucher-redemption.entity';
export { GiftCard } from './gift-card.entity';
export { GiftCardTransaction } from './gift-card-transaction.entity';

// Currency
export { Currency } from './currency.entity';
export { ExchangeRate } from './exchange-rate.entity';

// Accounting
export { ChartOfAccount } from './chart-of-account.entity';
export { CostCenter } from './cost-center.entity';
export { FiscalPeriod } from './fiscal-period.entity';
export { JournalEntry } from './journal-entry.entity';
export { JournalLine } from './journal-line.entity';

// Treasury
export { TreasuryAccount } from './treasury-account.entity';
export { TreasuryTransaction } from './treasury-transaction.entity';
export { BankReconciliation } from './bank-reconciliation.entity';

// Restaurant
export { RestaurantSection } from './restaurant-section.entity';
export { RestaurantTable } from './restaurant-table.entity';
export { TableSession } from './table-session.entity';
export { KitchenTicket } from './kitchen-ticket.entity';

// User Settings
export { UserAppearance } from './user-appearance.entity';
export { UserPreference } from './user-preference.entity';
export { UserBranch } from './user-branch.entity';

// HR Definitions
export { JobTitle } from './job-title.entity';
export { EmploymentTypeConfig } from './employment-type.entity';
export { LeaveTypeConfig } from './leave-type-config.entity';
export { PublicHoliday } from './public-holiday.entity';
export { TerminationReason } from './termination-reason.entity';

// Inventory Definitions
export { UnitOfMeasure } from './unit-of-measure.entity';
export { AdjustmentReason } from './adjustment-reason.entity';

// Sales & POS Definitions
export { VoucherTypeConfig } from './voucher-type.entity';
export { ReceiptTemplate } from './receipt-template.entity';
export { CancellationReason } from './cancellation-reason.entity';
export { VoidRefundReason } from './void-refund-reason.entity';
export { DiscountReason } from './discount-reason.entity';
export { HoldReason } from './hold-reason.entity';

// Purchases Definitions
export { PaymentTerm } from './payment-term.entity';
export { RejectionReason } from './rejection-reason.entity';

// Treasury Definitions
export { TransferReason } from './transfer-reason.entity';

// Invoices & Payments
export { Invoice } from './invoice.entity';
export { InvoiceLine } from './invoice-line.entity';
export { InvoiceLineTax } from './invoice-line-tax.entity';
export { PaymentNew } from './payment-new.entity';
export { InvoicePayment } from './invoice-payment.entity';

// Fiscal Positions
export { FiscalPosition } from './fiscal-position.entity';
export { FiscalPositionTax } from './fiscal-position-tax.entity';
export { FiscalPositionAccount } from './fiscal-position-account.entity';

// CRM Stages
export { CrmStage } from './crm-stage.entity';

// Company & Branch Settings
export { CompanySetting } from './company-setting.entity';
export { BranchSetting } from './branch-setting.entity';

// Partners
export { Partner } from './partner.entity';
export { PartnerContact } from './partner-contact.entity';

// Accounting Setup
export { AccountGroup } from './account-group.entity';
export { TaxGroup } from './tax-group.entity';
export { Tax } from './tax.entity';
export { Journal } from './journal.entity';
export { PaymentTermLine } from './payment-term-line.entity';

// Stock Locations & Shipping
export { StockLocation } from './stock-location.entity';
export { Delivery } from './delivery.entity';
export { DeliveryLine } from './delivery-line.entity';
export { Receipt } from './receipt.entity';
export { ReceiptLine } from './receipt-line.entity';

// HR & Payroll Restructure
export { SalaryStructure } from './salary-structure.entity';
export { SalaryRule } from './salary-rule.entity';
export { Payslip } from './payslip.entity';
export { PayslipLine } from './payslip-line.entity';
export { LeaveTypeEntity as LeaveType } from './leave-type.entity';
export { LeaveAllocation } from './leave-allocation.entity';
export { JobPosition } from './job-position.entity';
export { ShiftWorkingDay } from './shift-working-day.entity';

// Product Variants & Combos
export { ProductAttribute } from './product-attribute.entity';
export { ProductAttributeValue } from './product-attribute-value.entity';
export { ProductTemplateAttribute } from './product-template-attribute.entity';
export { ProductTemplateAttributeValue } from './product-template-attribute-value.entity';
export { ProductVariant } from './product-variant.entity';
export { ProductVariantAttributeValue } from './product-variant-attribute-value.entity';
export { ProductTax } from './product-tax.entity';
export { ComboProduct } from './combo-product.entity';
export { ComboGroup } from './combo-group.entity';
export { ComboGroupItem } from './combo-group-item.entity';

// Activities
export { Activity } from './activity.entity';

// Email Templates
export { EmailTemplate } from './email-template.entity';

// Bank Statements
export { BankStatement } from './bank-statement.entity';
export { BankStatementLine } from './bank-statement-line.entity';

// Pricelists
export { Pricelist } from './pricelist.entity';
export { PricelistItem } from './pricelist-item.entity';

// Supplier & Branch Products
export { SupplierProduct } from './supplier-product.entity';
export { BranchProduct } from './branch-product.entity';

// Down Payments
export { DownPayment } from './down-payment.entity';

// System
export { AuditLog } from './audit-log.entity';
export { OutboxEvent } from './outbox-event.entity';
export { SecurityEvent } from './security-event.entity';
export { RetentionLog } from './retention-log.entity';
export { ConsentRecord } from './consent-record.entity';
export { ErasureRequest } from './erasure-request.entity';
export { TenantMetric } from './tenant-metric.entity';
export { TenantNote } from './tenant-note.entity';
export { TenantOnboarding } from './tenant-onboarding.entity';
export { ImpersonationLog } from './impersonation-log.entity';
