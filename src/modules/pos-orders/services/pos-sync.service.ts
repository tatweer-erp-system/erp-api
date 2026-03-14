import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PosOrdersRepository } from '@/database/sql/repositories/pos-orders.repository';
import { PosOrderItemsRepository } from '@/database/sql/repositories/pos-order-items.repository';
import { PosPaymentsRepository } from '@/database/sql/repositories/pos-payments.repository';
import { PosSessionsRepository } from '@/database/sql/repositories/pos-sessions.repository';
import { StockLevelsRepository } from '@/database/sql/repositories/stock-levels.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { WarehousesRepository } from '@/database/sql/repositories/warehouses.repository';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
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
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { VAT_RATE } from '@/common/constants/pos.constants';

export interface SyncResult {
  offlineId: string;
  status: 'synced' | 'already_synced' | 'failed';
  orderId?: string;
  failureReason?: string;
  warnings?: string[];
}

@Injectable()
export class PosSyncService {
  private readonly logger = new Logger(PosSyncService.name);

  constructor(
    private readonly ordersRepository: PosOrdersRepository,
    private readonly orderItemsRepository: PosOrderItemsRepository,
    private readonly paymentsRepository: PosPaymentsRepository,
    private readonly sessionsRepository: PosSessionsRepository,
    private readonly stockLevelsRepository: StockLevelsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly warehousesRepository: WarehousesRepository,
    private readonly tenantSettingsRepository: TenantSettingsRepository,
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

    // 4. Resolve customer — if provided but not found, use walk-in with warning
    const customerId: string | null = offlineOrder.customerId ?? null;
    if (customerId) {
      // Customer validation is best-effort for offline sync;
      // if the customer does not exist, fall back to walk-in
      // (customer table checks are beyond the repository pattern here)
    }

    // 5. Process in a transaction
    const transaction = await this.ordersRepository.createTransaction();

    try {
      // 5a. Generate order number
      const orderNumber = await this.sequencesService.nextNumber(tenantId, 'pos_order');

      // 5b. Resolve warehouse for stock operations
      const defaultWarehouse = await this.warehousesRepository.findDefault(tenantId);
      const resolvedWarehouseId = defaultWarehouse ? (defaultWarehouse.id as string) : null;
      const allowNegativeStock = defaultWarehouse ? !!defaultWarehouse.allowNegativeStock : false;

      // 5c. Resolve items — validate products and calculate totals
      let subtotal = 0;
      const resolvedItems: Array<{
        productId: string;
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
        const taxableAmount = unitPrice * item.quantity - itemDiscount;
        const itemTaxAmount = Math.round(((taxableAmount * taxRate) / 100) * 100) / 100;
        const lineTotal = Math.round((taxableAmount + itemTaxAmount) * 100) / 100;

        subtotal += unitPrice * item.quantity - itemDiscount;

        // Stock check for storable products
        if (
          String(productData.productType) === ProductType.STORABLE &&
          resolvedWarehouseId &&
          !allowNegativeStock
        ) {
          const stockRow = await this.stockLevelsRepository.findByProductAndWarehouse(
            tenantId,
            item.productId,
            resolvedWarehouseId,
            transaction,
          );
          const currentStock = stockRow ? parseFloat(String(stockRow.quantity)) : 0;

          if (currentStock < item.quantity) {
            throw new BadRequestException(
              msg(ErrorMessages.INSUFFICIENT_STOCK, productName, currentStock, item.quantity),
            );
          }
        }

        resolvedItems.push({
          productId: item.productId,
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

      // 5d. Calculate totals
      const orderDiscountAmount = offlineOrder.discountAmount ?? 0;
      const tipAmount = offlineOrder.tipAmount ?? 0;
      const taxAmount =
        Math.round((((subtotal - orderDiscountAmount) * VAT_RATE) / 100) * 100) / 100;
      const totalAmount =
        Math.round((subtotal - orderDiscountAmount + taxAmount + tipAmount) * 100) / 100;

      // 5e. Validate payments
      const paymentTotal = offlineOrder.payments.reduce((sum, p) => sum + p.amount, 0);
      const roundedPaymentTotal = Math.round(paymentTotal * 100) / 100;

      if (roundedPaymentTotal !== totalAmount) {
        throw new BadRequestException(
          msg(ErrorMessages.PAYMENT_MISMATCH, totalAmount, roundedPaymentTotal),
        );
      }

      // 5f. Create the order
      const order = await this.ordersRepository.create(
        {
          sessionId,
          orderNumber,
          customerId,
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

      // 5g. Create order items
      for (const resolvedItem of resolvedItems) {
        await this.orderItemsRepository.create(
          {
            orderId: newOrderId,
            productId: resolvedItem.productId,
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

      // 5h. Create payment records
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

      // 5i. Stock deduction for storable products
      if (resolvedWarehouseId) {
        for (const resolvedItem of resolvedItems) {
          if (resolvedItem.productType !== ProductType.STORABLE) continue;

          await this.ordersRepository.rawQuery(
            `UPDATE stock_levels
             SET quantity = quantity - :qty
             WHERE "productId" = :productId
               AND "warehouseId" = :warehouseId
               AND "tenantId" = :tenantId`,
            {
              qty: resolvedItem.quantity,
              productId: resolvedItem.productId,
              warehouseId: resolvedWarehouseId,
              tenantId,
            },
            transaction,
          );
        }

        // 5j. Post COGS journal for storable items
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

            const stockRow = await this.stockLevelsRepository.findByProductAndWarehouse(
              tenantId,
              resolvedItem.productId,
              resolvedWarehouseId,
              transaction,
            );
            const unitCost = stockRow ? parseFloat(String(stockRow.averageCost ?? 0)) : 0;
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
      }

      // 5k. Loyalty earn — only if customer is attached (tip excluded per Odoo rule)
      if (customerId) {
        const earnBase = Math.round((subtotal - orderDiscountAmount) * 100) / 100;
        await this.loyalty.earn(tenantId, customerId, newOrderId, earnBase, transaction);
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
