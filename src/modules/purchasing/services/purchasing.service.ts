import { Injectable } from '@nestjs/common';
import { PurchaseOrdersRepository } from '@/database/sql/repositories/purchase-orders.repository';
import { ReceiptsRepository } from '@/database/sql/repositories/receipts.repository';
import { PurchaseOrder } from '@/database/sql/entities/purchase-order.entity';
import { PurchaseOrderLine } from '@/database/sql/entities/purchase-order-line.entity';
import { Receipt } from '@/database/sql/entities/receipt.entity';
import { ReceiptLine } from '@/database/sql/entities/receipt-line.entity';
import {
  PurchaseOrderStatus,
  PurchaseBillStatus,
  PurchaseReceiptStatus,
  ReceiptStatus,
} from '@/common/enums/purchasing.enums';

// ── Purchase Orders ──────────────────────────────────────────────────────────

@Injectable()
export class PurchasingService {
  constructor(
    private readonly purchaseOrdersRepo: PurchaseOrdersRepository,
    private readonly receiptsRepo: ReceiptsRepository,
  ) {}

  // Purchase Orders

  findAllOrders(
    branchId: string,
    filters: {
      status?: PurchaseOrderStatus;
      vendorId?: string;
      invoiceStatus?: PurchaseBillStatus;
      receiptStatus?: PurchaseReceiptStatus;
      search?: string;
    },
    page: number,
    limit: number,
  ) {
    return this.purchaseOrdersRepo.findAll(branchId, filters, page, limit);
  }

  findOrderById(id: string): Promise<PurchaseOrder> {
    return this.purchaseOrdersRepo.findById(id);
  }

  findOrderWithLines(id: string) {
    return this.purchaseOrdersRepo.findWithLines(id);
  }

  createOrder(data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return this.purchaseOrdersRepo.create(data);
  }

  updateOrder(id: string, version: number, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return this.purchaseOrdersRepo.update(id, version, data);
  }

  upsertOrderLines(
    orderId: string,
    lines: Partial<PurchaseOrderLine>[],
  ): Promise<PurchaseOrderLine[]> {
    return this.purchaseOrdersRepo.upsertLines(orderId, lines);
  }

  confirmOrder(id: string): Promise<PurchaseOrder> {
    return this.purchaseOrdersRepo.confirm(id);
  }

  cancelOrder(id: string): Promise<PurchaseOrder> {
    return this.purchaseOrdersRepo.cancel(id);
  }

  deleteOrder(id: string): Promise<void> {
    return this.purchaseOrdersRepo.softDelete(id);
  }

  // Receipts

  findAllReceipts(
    branchId: string,
    filters: {
      status?: ReceiptStatus;
      purchaseOrderId?: string;
      search?: string;
    },
    page: number,
    limit: number,
  ) {
    return this.receiptsRepo.findAll(branchId, filters, page, limit);
  }

  findReceiptById(id: string): Promise<Receipt> {
    return this.receiptsRepo.findById(id);
  }

  findReceiptWithLines(id: string) {
    return this.receiptsRepo.findWithLines(id);
  }

  createReceipt(data: Partial<Receipt>): Promise<Receipt> {
    return this.receiptsRepo.create(data);
  }

  updateReceipt(id: string, version: number, data: Partial<Receipt>): Promise<Receipt> {
    return this.receiptsRepo.update(id, version, data);
  }

  upsertReceiptLines(receiptId: string, lines: Partial<ReceiptLine>[]): Promise<ReceiptLine[]> {
    return this.receiptsRepo.upsertLines(receiptId, lines);
  }

  markReceiptDone(id: string): Promise<Receipt> {
    return this.receiptsRepo.done(id);
  }

  deleteReceipt(id: string): Promise<void> {
    return this.receiptsRepo.softDelete(id);
  }
}
