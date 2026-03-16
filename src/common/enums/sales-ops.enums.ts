/**
 * sales-ops.enums.ts
 * Re-exports operational sales enums from the canonical sales.enums file.
 * Add any new ops-specific enums here.
 */
export {
  SalesOrderStatus,
  SalesInvoiceStatus,
  SalesDeliveryStatus,
  DeliveryStatus,
} from '@/common/enums/sales.enums';

export enum LineInvoicingStatus {
  NOTHING = 'nothing',
  TO_INVOICE = 'to_invoice',
  INVOICED = 'invoiced',
}
