import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PosOrdersRepository } from '@/database/sql/repositories/pos-orders.repository';
import { PosOrderItemsRepository } from '@/database/sql/repositories/pos-order-items.repository';
import { PosRefundsRepository } from '@/database/sql/repositories/pos-refunds.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { WarehousesRepository } from '@/database/sql/repositories/warehouses.repository';
import { InventorySharedService } from '@/shared/services/inventory-shared.service';
import { LoyaltySharedService } from '@/shared/services/loyalty-shared.service';
import { VoucherGiftCardSharedService } from '@/shared/services/voucher-gift-card-shared.service';
import { InvoicesService } from '@/modules/invoices/services/invoices.service';
import { RefundOrderDto } from '../dto/refund-order.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { PosOrderStatus, OrderType, ProductType, RefundType } from '@/common/enums/pos.enums';
import { InvoiceTypeNew } from '@/common/enums/invoice.enums';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { VAT_RATE } from '@/common/constants/pos.constants';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly ordersRepository: PosOrdersRepository,
    private readonly orderItemsRepository: PosOrderItemsRepository,
    private readonly refundsRepository: PosRefundsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly warehousesRepository: WarehousesRepository,
    private readonly inventoryShared: InventorySharedService,
    private readonly sequencesService: SequencesService,
    private readonly loyalty: LoyaltySharedService,
    private readonly voucherGiftCard: VoucherGiftCardSharedService,
    private readonly invoicesService: InvoicesService,
  ) {}

  async refundOrder(
    tenantId: string,
    orderId: string,
    dto: RefundOrderDto,
    auditContext: AuditContext,
  ) {
    const order = await this.ordersRepository.findById(orderId, { tenantId });
    const orderData = order as unknown as Record<string, unknown>;

    if (orderData.status !== PosOrderStatus.PAID) {
      throw new BadRequestException(msg(ErrorMessages.ORDER_NOT_PAID, String(orderData.status)));
    }

    // Partial refund requires items list
    if (dto.refundType === RefundType.PARTIAL && (!dto.items || dto.items.length === 0)) {
      throw new BadRequestException(msg(ErrorMessages.REFUND_ITEMS_REQUIRED));
    }

    const transaction = await this.ordersRepository.createTransaction();

    try {
      const allItems = await this.orderItemsRepository.findAllRaw({
        where: { orderId: orderId },
        transaction,
      });

      // Determine which items to refund
      let itemsToRefund: Array<{ data: Record<string, unknown>; refundQty: number }>;

      if (dto.refundType === RefundType.PARTIAL && dto.items) {
        // Validate and map requested items
        const itemMap = new Map<string, Record<string, unknown>>();
        for (const item of allItems) {
          const d = item as unknown as Record<string, unknown>;
          itemMap.set(String(d.id), d);
        }

        itemsToRefund = [];
        for (const reqItem of dto.items) {
          const original = itemMap.get(reqItem.orderItemId);
          if (!original) {
            throw new BadRequestException(`Order item "${reqItem.orderItemId}" not found in order`);
          }
          const originalQty = parseFloat(String(original.quantity));
          if (reqItem.quantity > originalQty) {
            throw new BadRequestException(
              `Refund quantity (${reqItem.quantity}) exceeds original quantity (${originalQty}) for item "${original.productName}"`,
            );
          }
          itemsToRefund.push({ data: original, refundQty: reqItem.quantity });
        }
      } else {
        // Full refund — refund all items at full quantity
        itemsToRefund = allItems.map((item) => {
          const d = item as unknown as Record<string, unknown>;
          return { data: d, refundQty: parseFloat(String(d.quantity)) };
        });
      }

      const sessionId = orderData.sessionId;
      const refundOrderNumber = await this.sequencesService.nextNumber(tenantId, 'pos_order');

      // Calculate refund amounts from selected items
      let refundSubtotal = 0;
      const refundItemRecords: Array<Record<string, unknown>> = [];

      for (const { data, refundQty } of itemsToRefund) {
        const unitPrice = parseFloat(String(data.unitPrice ?? 0));
        const originalQty = parseFloat(String(data.quantity));
        const itemDiscount = parseFloat(String(data.discountAmount ?? 0));
        const taxRate = parseFloat(String(data.taxRate ?? VAT_RATE));

        // Proportional discount for partial qty refund
        const proportionalDiscount =
          originalQty > 0 ? Math.round(((itemDiscount * refundQty) / originalQty) * 100) / 100 : 0;
        const lineSubtotal = unitPrice * refundQty - proportionalDiscount;
        const lineTax = Math.round(((lineSubtotal * taxRate) / 100) * 100) / 100;
        const lineTotal = Math.round((lineSubtotal + lineTax) * 100) / 100;

        refundSubtotal += lineSubtotal;

        refundItemRecords.push({
          productId: data.productId ?? null,
          productVariantId: data.productVariantId ?? null,
          productName: data.productName,
          unitPrice: data.unitPrice,
          quantity: -refundQty,
          discountAmount: -proportionalDiscount,
          taxRate: data.taxRate,
          taxAmount: -lineTax,
          lineTotal: -lineTotal,
          course: data.course ?? null,
          notes: data.notes ?? null,
        });
      }

      refundSubtotal = Math.round(refundSubtotal * 100) / 100;
      const refundTax = Math.round(((refundSubtotal * VAT_RATE) / 100) * 100) / 100;
      const refundTotal = Math.round((refundSubtotal + refundTax) * 100) / 100;

      // 1. Create refund order with negative amounts
      const partnerId =
        (orderData.partnerId as string | null) ?? (orderData.customerId as string | null) ?? null;
      const refundOrder = await this.ordersRepository.create(
        {
          sessionId,
          orderNumber: refundOrderNumber,
          partnerId,
          customerId: partnerId, // backward compat
          orderType: orderData.orderType ?? OrderType.TAKEAWAY,
          status: PosOrderStatus.REFUNDED,
          subtotal: -refundSubtotal,
          discountAmount: 0,
          taxAmount: -refundTax,
          tipAmount: 0,
          totalAmount: -refundTotal,
          deliveryFee: 0,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const refundOrderData = refundOrder as unknown as Record<string, unknown>;
      const refundOrderId = refundOrderData.id as string;

      // 2. Insert refund items with negative quantities
      if (refundItemRecords.length > 0) {
        const mapped = refundItemRecords.map((r) => ({ ...r, orderId: refundOrderId }));
        await this.orderItemsRepository.bulkCreate({
          data: mapped,
          transaction,
        });
      }

      // 3. Create refund record
      await this.refundsRepository.create(
        {
          originalOrderId: orderId,
          refundOrderId,
          refundType: dto.refundType,
          totalRefunded: refundTotal,
          refundMethod: dto.refundMethod ?? null,
          reason: dto.reason ?? null,
          approvedBy: dto.approvedBy,
        } as any,
        { tenantId, auditContext, transaction },
      );

      // 4. Update original order status
      await this.ordersRepository.update(orderId, { status: PosOrderStatus.REFUNDED } as any, {
        tenantId,
        transaction,
        auditContext,
      });

      // 5. Restore stock via InventorySharedService for storable products
      let resolvedWarehouseId = dto.warehouseId ?? null;
      if (!resolvedWarehouseId) {
        const defaultWarehouse = await this.warehousesRepository.findDefault(tenantId);
        if (defaultWarehouse) resolvedWarehouseId = defaultWarehouse.id as string;
      }

      if (resolvedWarehouseId) {
        for (const { data, refundQty } of itemsToRefund) {
          const productId = data.productId as string | null;
          if (!productId) continue;

          const product = await this.productsRepository.findById(tenantId, productId);
          if (!product) continue;

          const productRecord = product as Record<string, unknown>;
          if (productRecord.productType !== ProductType.STORABLE) continue;

          try {
            await this.inventoryShared.createMovement(
              tenantId,
              {
                productId,
                warehouseId: resolvedWarehouseId!,
                movementType: StockMovementType.RETURN,
                quantity: refundQty, // positive = inbound (return)
                referenceId: refundOrderId,
                referenceType: StockReferenceType.POS_ORDER,
              } as any,
              transaction,
            );
          } catch (stockErr) {
            this.logger.warn(
              `Stock return failed for refund order ${refundOrderId}, product ${productId}: ${(stockErr as Error).message}`,
            );
          }
        }
      }

      // 6. Reverse loyalty points earned on original order
      if (dto.refundType === RefundType.FULL) {
        await this.loyalty.reverseEarn(tenantId, orderId, transaction);
      }

      // 7. Create credit note invoice via InvoicesService (type=out_refund)
      try {
        const sessionResult = await this.ordersRepository.rawQuery<{ branchId: string }[]>(
          `SELECT "branchId" FROM pos_sessions WHERE id = :sessionId AND "tenantId" = :tenantId LIMIT 1`,
          { sessionId, tenantId },
          transaction,
        );
        const branchId =
          sessionResult && sessionResult.length > 0 ? sessionResult[0].branchId : null;

        if (branchId && partnerId) {
          const creditNoteLines = refundItemRecords.map((r) => ({
            productId: (r.productId as string) ?? undefined,
            productVariantId: (r.productVariantId as string) ?? undefined,
            description: String(r.productName || 'Refund Item'),
            quantity: Math.abs(r.quantity as number),
            unitPrice: parseFloat(String(r.unitPrice ?? 0)),
            discountPct: 0,
          }));

          const creditNote = await this.invoicesService.create(
            tenantId,
            {
              branchId,
              partnerId,
              invoiceType: InvoiceTypeNew.OUT_REFUND,
              invoiceDate: new Date().toISOString().split('T')[0],
              reference: `REFUND-${refundOrderNumber}`,
              narration: `POS credit note for refund of order ${orderData.orderNumber}`,
              lines: creditNoteLines,
            },
            auditContext,
            transaction,
          );

          if (creditNote) {
            const cnRecord = creditNote as unknown as Record<string, unknown>;
            const creditNoteId = cnRecord.id as string;

            // Link credit note to refund order
            await this.ordersRepository.update(refundOrderId, { invoiceId: creditNoteId } as any, {
              tenantId,
              transaction,
              auditContext,
            });

            // Auto-post the credit note
            try {
              await this.invoicesService.post(tenantId, creditNoteId, auditContext, transaction);
            } catch (postErr) {
              this.logger.warn(
                `Credit note posting failed for refund order ${refundOrderId}: ${(postErr as Error).message}`,
              );
            }
          }
        }
      } catch (invoiceErr) {
        // Credit note creation should not block refund — log and continue
        this.logger.warn(
          `Credit note creation failed for refund order ${refundOrderId}: ${(invoiceErr as Error).message}`,
        );
      }

      await transaction.commit();

      // Return refund order with items
      const completedRefundOrder = await this.ordersRepository.findById(refundOrderId, {
        tenantId,
      });
      const refundItemsResult = await this.orderItemsRepository.findAllRaw({
        where: { orderId: refundOrderId },
        order: [['createdAt', 'ASC']],
      });

      return {
        ...(completedRefundOrder as unknown as Record<string, unknown>),
        items: refundItemsResult,
        refund: await this.refundsRepository.findOne({
          where: { refundOrderId: refundOrderId },
          tenantId,
        }),
      };
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
}
