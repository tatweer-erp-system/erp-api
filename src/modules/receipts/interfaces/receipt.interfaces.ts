export interface ReceiptRecord {
  id: string;
  tenantId: string;
  branchId: string;
  reference: string | null;
  purchaseOrderId: string | null;
  partnerId: string;
  status: string;
  scheduledDate: string | null;
  doneDate: string | null;
  responsibleId: string | null;
  notes: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  lines?: ReceiptLineRecord[];
}

export interface ReceiptLineRecord {
  id: string;
  tenantId: string;
  branchId: string;
  receiptId: string;
  productId: string;
  purchaseOrderLineId: string | null;
  stockMoveId: string | null;
  productVariantId: string | null;
  qtyDemand: number;
  qtyDone: number;
  unitOfMeasureId: string | null;
  locationId: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  expiryDate: string | null;
  unitCost: number;
}
