export interface DeliveryRecord {
  id: string;
  tenantId: string;
  branchId: string;
  reference: string | null;
  saleOrderId: string | null;
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
  lines?: DeliveryLineRecord[];
}

export interface DeliveryLineRecord {
  id: string;
  tenantId: string;
  branchId: string;
  deliveryId: string;
  productId: string;
  saleOrderLineId: string | null;
  stockMoveId: string | null;
  productVariantId: string | null;
  qtyDemand: number;
  qtyDone: number;
  unitOfMeasureId: string | null;
  locationId: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
}
