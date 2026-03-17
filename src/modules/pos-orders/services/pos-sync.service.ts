import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PosOrdersRepository } from '@/database/sql/repositories/pos-orders.repository';
import { PosOrderItemsRepository } from '@/database/sql/repositories/pos-order-items.repository';
import { PosPaymentsRepository } from '@/database/sql/repositories/pos-payments.repository';
import { PosSessionsRepository } from '@/database/sql/repositories/pos-sessions.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { ProductVariantsRepository } from '@/database/sql/repositories/product-variants.repository';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { InventorySharedService } from '@/shared/services/inventory-shared.service';
import { LoyaltySharedService } from '@/shared/services/loyalty-shared.service';
import { JournalPosterSharedService } from '@/shared/services/journal-poster-shared.service';
import { CurrencyService } from '@/modules/currency/currency.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { SyncBatchDto, OfflineOrderDto } from '../dto/sync-batch.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import {
  PosOrderStatus,
  PosSessionStatus,
  PaymentMethod,
  ProductType,
} from '@/common/enums/pos.enums';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { VAT_RATE } from '@/common/constants/pos.constants';
import { SyncResult } from '../interfaces/pos-orders.interfaces';

@Injectable()
export class PosSyncService {
  private readonly logger = new Logger(PosSyncService.name);

  constructor(
    private readonly ordersRepository: PosOrdersRepository,
    private readonly orderItemsRepository: PosOrderItemsRepository,
    private readonly paymentsRepository: PosPaymentsRepository,
    private readonly sessionsRepository: PosSessionsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly productVariantsRepository: ProductVariantsRepository,
    private readonly tenantSettingsRepository: TenantSettingsRepository,
    private readonly inventoryShared: InventorySharedService,
    private readonly loyalty: LoyaltySharedService,
    private readonly currencyService: CurrencyService,
    private readonly journalPosterService: JournalPosterSharedService,
    private readonly sequencesService: SequencesService,
  ) {}

  async syncBatch(tenantId: string, dto: SyncBatchDto, auditContext: AuditContext) {
    const results: SyncResult[] = [];

    for (const offlineOrder of dto.orders) {
      try {
        const result = await this.syncSingleOrder(
          tenantId,
          dto.sessionId,
          offlineOrder,
          auditContext,
        );
        results.push(result);
      } catch (err) {
        results.push({
          offlineId: offlineOrder.offlineId,
          status: 'failed' as const,
          failureReason: (err as Error).message,
        });
      }
    }

    const synced = results.filter((r) => r.status === 'synced').length;
    const alreadySynced = results.filter((r) => r.status === 'already_synced').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return { total: results.length, synced, alreadySynced, failed, results };
  }

  private async syncSingleOrder(
    tenantId: string,
    sessionId: string,
    offlineOrder: OfflineOrderDto,
    auditContext: AuditContext,
  ): Promise<SyncResult> {
    const warnings: string[] = [];

    // 1. Idempotency check — look up by offlineId
    const existing = await this.ordersRepository.findOne({
      where: { offlineId: offlineOrder.offlineId },
      tenantId,
    });
    if (existing) {
      const existingData = existing as unknown as Record<string, unknown>;
      return {
        offlineId: offlineOrder.offlineId,
        status: 'already_synced',
        orderId: existingData.id as string,
      };
    }

    // 2. Session validation
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      tenantId,
    });
    if (!session) {
      throw new BadRequestException(msg(ErrorMessages.SYNC_SESSION_NOT_FOUND, sessionId));
    }
    const sessionData = session as unknown as Record<string, unknown>;
    if (sessionData.status !== PosSessionStatus.OPEN) {
      throw new BadRequestException(msg(ErrorMessages.SESSION_CLOSED));
    }

    // 3. Resolve currency — default to tenant base currency
    const baseCurrency = await this.currencyService.getBaseCurrency(tenantId);

    // 4. Resolve partner — use partnerId (fall back to customerId for backward compat)
    const partnerId: string | null = offlineOrder.partnerId ?? offlineOrder.customerId ?? null;

    // 5. Process in a transaction
    const transaction = await this.ordersRepository.createTransaction();

    try {
      // 5a. Generate order number
      const orderNumber = await this.sequencesService.nextNumber(tenantId, 'pos_order');

      // 5b. Resolve items — validate products/variants and calculate totals
      let subtotal = 0;
      const resolvedItems: Array<{
        productId: string;
        productVariantId: string | null;
        productName: string;
        unitPrice: number;
        quantity: number;
        discountAmount: number;
        taxRate: number;
        taxAmount: number;
        lineTotal: number;
        notes: string | null;
        productType: string;
      }> = [];

      for (const item of offlineOrder.items) {
        const product = await this.productsRepository.findById(tenantId, item.productId);
        if (!product) {
          throw new BadRequestException(msg(ErrorMessages.PRODUCT_NOT_FOUND, item.productId));
        }

        const productData = product as Record<string, unknown>;
        const productName = String(productData.nameEn || productData.nameAr || '');
        const unitPrice = item.unitPrice;
        const taxRate = parseFloat(String(productData.taxRate ?? 15));
        const itemDiscount = item.discountAmount ?? 0;

        // Variant support
        let resolvedVariantId: string | null = null;
        if (item.productVariantId) {
          const variant = await this.productVariantsRepository.findById(
            tenantId,
            item.productVariantId,
          );
          if (variant) {
            const variantData = variant as Record<string, unknown>;
            if (variantData.productId === item.productId) {
              const priceExtra = parseFloat(String(variantData.priceExtra ?? 0));
              // Use offline unitPrice as-is (already includes variant extra)
              resolvedVariantId = item.productVariantId;
            } else {
              warnings.push(
                `Variant ${item.productVariantId} does not belong to product ${item.productId}`,
              );
            }
          } else {
            warnings.push(`Variant ${item.productVariantId} not found, proceeding without`);
          }
        }

        const taxableAmount = unitPrice * item.quantity - itemDiscount;
        const itemTaxAmount = Math.round(((taxableAmount * taxRate) / 100) * 100) / 100;
        const lineTotal = Math.round((taxableAmount + itemTaxAmount) * 100) / 100;

        subtotal += unitPrice * item.quantity - itemDiscount;

        resolvedItems.push({
          productId: item.productId,
          productVariantId: resolvedVariantId,
          productName,
          unitPrice,
          quantity: item.quantity,
          discountAmount: itemDiscount,
          taxRate,
          taxAmount: itemTaxAmount,
          lineTotal,
          notes: item.notes ?? null,
          productType: String(productData.productType),
        });
      }

      subtotal = Math.round(subtotal * 100) / 100;

      // 5c. Calculate totals
      const orderDiscountAmount = offlineOrder.discountAmount ?? 0;
      const tipAmount = offlineOrder.tipAmount ?? 0;
      const taxAmount =
        Math.round((((subtotal - orderDiscountAmount) * VAT_RATE) / 100) * 100) / 100;
      const totalAmount =
        Math.round((subtotal - orderDiscountAmount + taxAmount + tipAmount) * 100) / 100;

      // 5d. Validate payments
      const paymentTotal = offlineOrder.payments.reduce((sum, p) => sum + p.amount, 0);
      const roundedPaymentTotal = Math.round(paymentTotal * 100) / 100;

      if (roundedPaymentTotal !== totalAmount) {
        throw new BadRequestException(
          msg(ErrorMessages.PAYMENT_MISMATCH, totalAmount, roundedPaymentTotal),
        );
      }

      // 5e. Create the order
      const order = await this.ordersRepository.create(
        {
          sessionId,
          orderNumber,
          partnerId,
          customerId: partnerId, // backward compat
          tableId: offlineOrder.tableId ?? null,
          orderType: offlineOrder.orderType,
          status: PosOrderStatus.PAID,
          subtotal,
          discountAmount: orderDiscountAmount,
          taxAmount,
          tipAmount,
          totalAmount,
          deliveryFee: 0,
          offlineId: offlineOrder.offlineId,
          syncedAt: new Date(),
          createdOfflineAt: new Date(offlineOrder.createdAt),
          currencyId: baseCurrency.id,
          exchangeRate: 1,
          totalAmountBase: totalAmount,
        } as any,
        { tenantId, transaction, auditContext },
      );

      const orderData = order as unknown as Record<string, unknown>;
      const newOrderId = orderData.id as string;

      // 5f. Create order items
      for (const resolvedItem of resolvedItems) {
        await this.orderItemsRepository.create(
          {
            orderId: newOrderId,
            productId: resolvedItem.productId,
            productVariantId: resolvedItem.productVariantId,
            productName: resolvedItem.productName,
            unitPrice: resolvedItem.unitPrice,
            quantity: resolvedItem.quantity,
            discountAmount: resolvedItem.discountAmount,
            taxRate: resolvedItem.taxRate,
            taxAmount: resolvedItem.taxAmount,
            lineTotal: resolvedItem.lineTotal,
            notes: resolvedItem.notes,
          } as any,
          { transaction },
        );
      }

      // 5g. Create payment records
      for (const payment of offlineOrder.payments) {
        await this.paymentsRepository.create(
          {
            orderId: newOrderId,
            method: payment.method,
            amount: payment.amount,
            reference: payment.reference ?? null,
            currencyId: baseCurrency.id,
          } as any,
          { transaction },
        );
      }

      // 5h. Stock deduction via InventorySharedService for storable products
      // Resolve default warehouse once before the loop
      const warehouseResult = await this.ordersRepository.rawQuery<{ id: string }[]>(
        `SELECT id FROM warehouses WHERE "tenantId" = :tenantId AND "isDefault" = true AND "deletedAt" IS NULL LIMIT 1`,
        { tenantId },
        transaction,
      );
      const resolvedWarehouseId =
        warehouseResult && warehouseResult.length > 0 ? warehouseResult[0].id : null;

      if (resolvedWarehouseId) {
        for (const resolvedItem of resolvedItems) {
          if (resolvedItem.productType !== ProductType.STORABLE) continue;

          try {
            await this.inventoryShared.createMovement(
              tenantId,
              {
                productId: resolvedItem.productId,
                warehouseId: resolvedWarehouseId,
                movementType: StockMovementType.POS_SALE,
                quantity: -resolvedItem.quantity,
                referenceId: newOrderId,
                referenceType: StockReferenceType.POS_ORDER,
              } as any,
              transaction,
            );
          } catch (stockErr) {
            // For offline sync, stock errors block the order
            throw new BadRequestException((stockErr as Error).message);
          }
        }
      }

      // 5i. Post COGS journal for storable items
      const cogsSettingRow = await this.tenantSettingsRepository.findByKeyTenant(
        tenantId,
        'coaCogs',
      );
      const inventorySettingRow = await this.tenantSettingsRepository.findByKeyTenant(
        tenantId,
        'coaInventory',
      );
      const cogsAccountId = cogsSettingRow?.value ?? null;
      const inventoryAccountId = inventorySettingRow?.value ?? null;

      if (cogsAccountId && inventoryAccountId) {
        let totalCogs = 0;

        for (const resolvedItem of resolvedItems) {
          if (resolvedItem.productType !== ProductType.STORABLE) continue;

          const stockLevels = await this.inventoryShared.getStockLevel(
            tenantId,
            resolvedItem.productId,
          );
          const unitCost =
            stockLevels.length > 0 ? parseFloat(String(stockLevels[0].averageCost ?? 0)) : 0;
          totalCogs += resolvedItem.quantity * unitCost;
        }

        if (totalCogs > 0) {
          try {
            await this.journalPosterService.post(
              tenantId,
              {
                entryDate: new Date().toISOString().split('T')[0],
                description: `COGS for POS order ${orderNumber}`,
                referenceId: newOrderId,
                referenceType: 'pos_order_cogs',
                lines: [
                  {
                    accountId: cogsAccountId,
                    debit: totalCogs,
                    credit: 0,
                    description: `COGS: order ${orderNumber}`,
                  },
                  {
                    accountId: inventoryAccountId,
                    debit: 0,
                    credit: totalCogs,
                    description: `Inventory: order ${orderNumber}`,
                  },
                ],
              },
              auditContext,
              transaction,
            );
          } catch (cogsErr) {
            this.logger.warn(
              `COGS journal failed for synced order ${newOrderId}: ${(cogsErr as Error).message}`,
            );
          }
        }
      }

      // 5j. Loyalty earn — only if partner is attached (tip excluded per Odoo rule)
      if (partnerId) {
        const earnBase = Math.round((subtotal - orderDiscountAmount) * 100) / 100;
        await this.loyalty.earn(tenantId, partnerId, newOrderId, earnBase, transaction);
      }

      await transaction.commit();

      return {
        offlineId: offlineOrder.offlineId,
        status: 'synced' as const,
        orderId: newOrderId,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
}
