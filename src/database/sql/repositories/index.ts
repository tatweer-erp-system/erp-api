export { AdminsRepository } from './admins.repository';
export { CashMovementsRepository } from './cash-movements.repository';
export { AdminNotificationsRepository } from './admin-notifications.repository';
export { ApiKeysRepository } from './api-keys.repository';
export { AuthRepository } from './auth.repository';
export { BranchesRepository } from './branches.repository';
export { CategoriesRepository } from './categories.repository';
export { ContactsRepository } from './contacts.repository';
export { DepartmentsRepository } from './departments.repository';
export { EmployeesRepository } from './employees.repository';
export { LeadActivitiesRepository } from './lead-activities.repository';
export { LeadsRepository } from './leads.repository';
export { ManagerOverridesRepository } from './manager-overrides.repository';
export { LeavesRepository } from './leaves.repository';
export { NotificationPreferencesRepository } from './notification-preferences.repository';
export { NotificationsRepository } from './notifications.repository';
export { NotificationTemplatesRepository } from './notification-templates.repository';
export { PaymentTransactionsRepository } from './payment-transactions.repository';
export { PermissionsRepository } from './permissions.repository';
export { PlansRepository } from './plans.repository';
export { PosCashiersRepository } from './pos-cashiers.repository';
export { PosSessionsRepository } from './pos-sessions.repository';
export { PosTerminalsRepository } from './pos-terminals.repository';
export { ProductsRepository } from './products.repository';
export { ProjectMembersRepository } from './project-members.repository';
export { ProjectsRepository } from './projects.repository';
export { PurchaseOrderLinesRepository } from './purchase-order-lines.repository';
export { PurchaseOrdersRepository } from './purchase-orders.repository';
export { ReportingRepository } from './reporting.repository';
export { RolesRepository } from './roles.repository';
export { SalesOrderLinesRepository } from './sales-order-lines.repository';
export { SalesOrdersRepository } from './sales-orders.repository';
export { SequencesRepository } from './sequences.repository';
export { SystemSettingsRepository } from './system-settings.repository';
export { TenantSettingsRepository } from './tenant-settings.repository';
export { StockLevelsRepository } from './stock-levels.repository';
export { StockMovementsRepository } from './stock-movements.repository';
export { SubscriptionsRepository } from './subscriptions.repository';
export { TasksRepository } from './tasks.repository';
export { TaskTimeEntriesRepository } from './task-time-entries.repository';
export { TenantNotesRepository } from './tenant-notes.repository';
export { TenantsRepository } from './tenants.repository';
export { TicketRepliesRepository } from './ticket-replies.repository';
export { TicketsRepository } from './tickets.repository';
export { UsersRepository } from './users.repository';
export { VendorsRepository } from './vendors.repository';
export { WarehousesRepository } from './warehouses.repository';
export { LoyaltyProgramsRepository } from './loyalty-programs.repository';
export { LoyaltyTiersRepository } from './loyalty-tiers.repository';
export { LoyaltyAccountsRepository } from './loyalty-accounts.repository';
export { LoyaltyTransactionsRepository } from './loyalty-transactions.repository';
export { VouchersRepository } from './vouchers.repository';
export { VoucherRedemptionsRepository } from './voucher-redemptions.repository';
export { GiftCardsRepository } from './gift-cards.repository';
export { GiftCardTransactionsRepository } from './gift-card-transactions.repository';
export { CurrenciesRepository } from './currencies.repository';
export { ExchangeRatesRepository } from './exchange-rates.repository';
export { PosOrdersRepository } from './pos-orders.repository';
export { PosOrderItemsRepository } from './pos-order-items.repository';
export { PosPaymentsRepository } from './pos-payments.repository';
export { PosHeldOrdersRepository } from './pos-held-orders.repository';
export { PosRefundsRepository } from './pos-refunds.repository';
export { ChartOfAccountsRepository } from './chart-of-accounts.repository';
export { CostCentersRepository } from './cost-centers.repository';
export { FiscalPeriodsRepository } from './fiscal-periods.repository';
export { JournalEntriesRepository } from './journal-entries.repository';
export { JournalLinesRepository } from './journal-lines.repository';
export { TreasuryAccountsRepository } from './treasury-accounts.repository';
export { TreasuryTransactionsRepository } from './treasury-transactions.repository';
export { BankReconciliationsRepository } from './bank-reconciliations.repository';
export { RestaurantSectionsRepository } from './restaurant-sections.repository';
export { RestaurantTablesRepository } from './restaurant-tables.repository';
export { TableSessionsRepository } from './table-sessions.repository';
export { KitchenTicketsRepository } from './kitchen-tickets.repository';
export { ShiftsRepository } from './shifts.repository';
export { AttendanceRecordsRepository } from './attendance-records.repository';
export { PayrollRunsRepository } from './payroll-runs.repository';
export { PayrollItemsRepository } from './payroll-items.repository';
export { TrainingRecordsRepository } from './training-records.repository';
export { EmployeeContractsRepository } from './employee-contracts.repository';
export { AuditLogsRepository } from './audit-logs.repository';
export { ReleasesRepository } from './releases.repository';

// HR Definitions
export { JobTitlesRepository } from './job-titles.repository';
export { EmploymentTypesRepository } from './employment-types.repository';
export { LeaveTypesConfigRepository } from './leave-types-config.repository';
export { PublicHolidaysRepository } from './public-holidays.repository';
export { TerminationReasonsRepository } from './termination-reasons.repository';

// Inventory Definitions
export { UnitsOfMeasureRepository } from './units-of-measure.repository';
export { AdjustmentReasonsRepository } from './adjustment-reasons.repository';

// Sales & POS Definitions
export { VoucherTypesRepository } from './voucher-types.repository';
export { ReceiptTemplatesRepository } from './receipt-templates.repository';
export { CancellationReasonsRepository } from './cancellation-reasons.repository';
export { VoidRefundReasonsRepository } from './void-refund-reasons.repository';
export { DiscountReasonsRepository } from './discount-reasons.repository';
export { HoldReasonsRepository } from './hold-reasons.repository';

// Purchases Definitions
export { PaymentTermsRepository } from './payment-terms.repository';
export { RejectionReasonsRepository } from './rejection-reasons.repository';

// Treasury Definitions
export { TransferReasonsRepository } from './transfer-reasons.repository';

// User
export { UserPreferencesRepository } from './user-preferences.repository';
export { UserBranchesRepository } from './user-branches.repository';

// Partners
export { PartnersRepository } from './partners.repository';
export { PartnerContactsRepository } from './partner-contacts.repository';

// Accounting Setup
export { AccountGroupsRepository } from './account-groups.repository';
export { TaxGroupsRepository } from './tax-groups.repository';
export { TaxesRepository } from './taxes.repository';
export { JournalsRepository } from './journals.repository';
export { PaymentTermLinesRepository } from './payment-term-lines.repository';

// Stock Locations & Shipping
export { StockLocationsRepository } from './stock-locations.repository';
export { DeliveriesRepository } from './deliveries.repository';
export { DeliveryLinesRepository } from './delivery-lines.repository';
export { ReceiptsRepository } from './receipts.repository';
export { ReceiptLinesRepository } from './receipt-lines.repository';

// HR & Payroll Restructure
export { SalaryStructuresRepository } from './salary-structures.repository';
export { SalaryRulesRepository } from './salary-rules.repository';
export { PayslipsRepository } from './payslips.repository';
export { PayslipLinesRepository } from './payslip-lines.repository';
export { LeaveTypesRepository } from './leave-types.repository';
export { LeaveAllocationsRepository } from './leave-allocations.repository';
export { JobPositionsRepository } from './job-positions.repository';
export { ShiftWorkingDaysRepository } from './shift-working-days.repository';

// Product Variants & Combos
export { ProductAttributesRepository } from './product-attributes.repository';
export { ProductAttributeValuesRepository } from './product-attribute-values.repository';
export { ProductTemplateAttributesRepository } from './product-template-attributes.repository';
export { ProductTemplateAttributeValuesRepository } from './product-template-attribute-values.repository';
export { ProductVariantsRepository } from './product-variants.repository';
export { ProductVariantAttributeValuesRepository } from './product-variant-attribute-values.repository';
export { ProductTaxesRepository } from './product-taxes.repository';
export { ComboProductsRepository } from './combo-products.repository';
export { ComboGroupsRepository } from './combo-groups.repository';
export { ComboGroupItemsRepository } from './combo-group-items.repository';

// Activities
export { ActivitiesRepository } from './activities.repository';

// Email Templates
export { EmailTemplatesRepository } from './email-templates.repository';

// Bank Statements
export { BankStatementsRepository } from './bank-statements.repository';
export { BankStatementLinesRepository } from './bank-statement-lines.repository';

// Pricelists
export { PricelistsRepository } from './pricelists.repository';
export { PricelistItemsRepository } from './pricelist-items.repository';

// Supplier & Branch Products
export { SupplierProductsRepository } from './supplier-products.repository';
export { BranchProductsRepository } from './branch-products.repository';

// Down Payments
export { DownPaymentsRepository } from './down-payments.repository';

// Invoices & Payments
export { InvoicesRepository } from './invoices.repository';
export { InvoiceLinesRepository } from './invoice-lines.repository';
export { InvoiceLineTaxesRepository } from './invoice-line-taxes.repository';
export { PaymentsNewRepository } from './payments-new.repository';
export { InvoicePaymentsRepository } from './invoice-payments.repository';

// Fiscal Positions
export { FiscalPositionsRepository } from './fiscal-positions.repository';
export { FiscalPositionTaxesRepository } from './fiscal-position-taxes.repository';
export { FiscalPositionAccountsRepository } from './fiscal-position-accounts.repository';

// CRM Stages
export { CrmStagesRepository } from './crm-stages.repository';

// Company & Branch Settings
export { CompanySettingsRepository } from './company-settings.repository';
export { BranchSettingsRepository } from './branch-settings.repository';
