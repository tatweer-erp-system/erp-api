import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { PosOrdersRepository } from '@/database/sql/repositories/pos-orders.repository';
import { PosOrderItemsRepository } from '@/database/sql/repositories/pos-order-items.repository';
import { PosPaymentsRepository } from '@/database/sql/repositories/pos-payments.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { WarehousesRepository } from '@/database/sql/repositories/warehouses.repository';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { PartnersRepository } from '@/database/sql/repositories/partners.repository';
import { InventorySharedService } from '@/shared/services/inventory-shared.service';
import { LoyaltySharedService } from '@/shared/services/loyalty-shared.service';
import { VoucherGiftCardSharedService } from '@/shared/services/voucher-gift-card-shared.service';
import { JournalPosterSharedService } from '@/shared/services/journal-poster-shared.service';
import { CurrencyService } from '@/modules/currency/currency.service';
import { InvoicesService } from '@/modules/invoices/services/invoices.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { CheckoutDto } from '../dto/checkout.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PosOrderStatus, DiscountType, PaymentMethod, ProductType } from '@/common/enums/pos.enums';
import { InvoiceTypeNew } from '@/common/enums/invoice.enums';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { VAT_RATE } from '@/common/constants/pos.constants';

@Injectable()
export class PosCheckoutService {
  private readonly logger = new Logger(PosCheckoutService.name);

  constructor(
    private readonly ordersRepository: PosOrdersRepository,
    private readonly orderItemsRepository: PosOrderItemsRepository,
    private readonly paymentsRepository: PosPaymentsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly warehousesRepository: WarehousesRepository,
    private readonly partnersRepository: PartnersRepository,
    private readonly voucherGiftCard: VoucherGiftCardSharedService,
    private readonly loyalty: LoyaltySharedService,
    private readonly inventoryShared: InventorySharedService,
    private readonly currencyService: CurrencyService,
    private readonly journalPosterService: JournalPosterSharedService,
    private readonly tenantSettingsRepository: TenantSettingsRepository,
    private readonly invoicesService: InvoicesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async checkout(
    tenantId: string,
    orderId: string,
    dto: CheckoutDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.ordersRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // 1. Load order - must be open
      const order = await this.ordersRepository.findById(orderId, { tenantId, transaction });
      const orderData = order as unknown as Record<string, unknown>;

      if (orderData.status !== PosOrderStatus.OPEN) {
        throw new BadRequestException(msg(ErrorMessages.ORDER_NOT_OPEN, String(orderData.status)));
      }

      // 1b. Resolve currency — default to tenant base currency
      const baseCurrency = await this.currencyService.getBaseCurrency(tenantId);
      const isForeignCurrency = !!dto.currencyId && dto.currencyId !== baseCurrency.id;
      let resolvedCurrencyId = baseCurrency.id;
      let exchangeRate = 1;

      if (isForeignCurrency) {
        exchangeRate = await this.currencyService.getRate(
          tenantId,
          dto.currencyId!,
          baseCurrency.id,
        );
        resolvedCurrencyId = dto.currencyId!;
      }

      // 2. Resolve partner — use partnerId from order, not a separate contacts table
      const partnerId = (orderData.partnerId as string | null) ?? null;
      let partnerData: Record<string, unknown> | null = null;

      if (partnerId) {
        const partner = await this.partnersRepository.findOneById(tenantId, partnerId);
        if (partner) {
          partnerData = partner as Record<string, unknown>;
        }
      }

      // 2b. Validate customer requirement for voucher/loyalty
      const hasVoucher = !!dto.voucherCode;
      const hasLoyaltyPayment = dto.payments.some((p) => p.method === PaymentMethod.LOYALTY_POINTS);

      if ((hasVoucher || hasLoyaltyPayment) && !partnerId) {
        throw new BadRequestException(msg(ErrorMessages.CUSTOMER_REQUIRED));
      }

      // Load items for calculations
      const items = await this.orderItemsRepository.findAllRaw({
        where: { orderId: orderId },
        transaction,
      });

      if (items.length === 0) {
        throw new BadRequestException(msg(ErrorMessages.ORDER_EMPTY));
      }

      // Calculate subtotal from items
      let subtotal = 0;
      for (const item of items) {
        const data = item as unknown as Record<string, unknown>;
        const unitPrice = parseFloat(String(data.unitPrice ?? 0));
        const quantity = parseFloat(String(data.quantity ?? 0));
        const itemDiscount = parseFloat(String(data.discountAmount ?? 0));
        subtotal += unitPrice * quantity - itemDiscount;
      }
      subtotal = Math.round(subtotal * 100) / 100;

      // 3. Apply order-level discount
      let orderDiscountAmount = 0;
      if (dto.discount) {
        if (dto.discount.type === DiscountType.PERCENT) {
          orderDiscountAmount = Math.round(((subtotal * dto.discount.value) / 100) * 100) / 100;
        } else {
          orderDiscountAmount = Math.min(dto.discount.value, subtotal);
        }
      }

      // 4. Apply voucher if provided
      let voucherDiscountAmount = 0;
      let voucherId: string | null = null;
      if (dto.voucherCode) {
        const voucherResult = await this.voucherGiftCard.validateVoucher(
          tenantId,
          dto.voucherCode,
          subtotal,
          partnerId ?? undefined,
        );
        if (!voucherResult.valid) {
          throw new BadRequestException(voucherResult.error || 'Voucher is not valid');
        }
        voucherDiscountAmount = voucherResult.discountAmount ?? 0;
        voucherId = voucherResult.voucherId ?? null;
        orderDiscountAmount += voucherDiscountAmount;
      }

      // 5. Recalculate final totals
      // Tax is always calculated after discount
      const deliveryFee = parseFloat(String(orderData.deliveryFee ?? 0));
      const tipAmount = dto.tipAmount ?? 0;
      const taxAmount =
        Math.round((((subtotal - orderDiscountAmount) * VAT_RATE) / 100) * 100) / 100;
      const totalAmount =
        Math.round((subtotal - orderDiscountAmount + taxAmount + tipAmount + deliveryFee) * 100) /
        100;

      // 6. Validate payments
      const paymentTotal = dto.payments.reduce((sum, p) => sum + p.amount, 0);
      const roundedPaymentTotal = Math.round(paymentTotal * 100) / 100;

      if (roundedPaymentTotal !== totalAmount) {
        throw new BadRequestException(
          msg(ErrorMessages.PAYMENT_MISMATCH, totalAmount, roundedPaymentTotal),
        );
      }

      // Validate cash payments
      for (const payment of dto.payments) {
        if (payment.method === PaymentMethod.CASH) {
          if (payment.amountGiven !== undefined && payment.amountGiven < payment.amount) {
            throw new BadRequestException(msg(ErrorMessages.CASH_AMOUNT_INSUFFICIENT));
          }
        }
      }

      // 7. Begin atomic operations

      // 7a. Update order status and amounts
      await this.ordersRepository.update(
        orderId,
        {
          status: PosOrderStatus.PAID,
          subtotal,
          discountAmount: orderDiscountAmount,
          taxAmount,
          tipAmount,
          totalAmount,
          currencyId: resolvedCurrencyId,
          exchangeRate,
          totalAmountBase: isForeignCurrency
            ? Math.round(totalAmount * exchangeRate * 100) / 100
            : totalAmount,
        } as any,
        { tenantId, transaction, auditContext },
      );

      // 7b. Insert payment records
      for (const payment of dto.payments) {
        const changeAmount =
          payment.method === PaymentMethod.CASH && payment.amountGiven
            ? Math.round((payment.amountGiven - payment.amount) * 100) / 100
            : 0;

        await this.paymentsRepository.create(
          {
            orderId,
            method: payment.method,
            amount: payment.amount,
            amountGiven: payment.amountGiven ?? null,
            changeAmount,
            reference: payment.reference ?? null,
            giftCardId: payment.giftCardId ?? null,
            currencyId: resolvedCurrencyId,
          } as any,
          { transaction },
        );
      }

      // 7c. Stock deduction via InventorySharedService for storable products
      let resolvedWarehouseId = dto.warehouseId ?? null;
      if (!resolvedWarehouseId) {
        const defaultWarehouse = await this.warehousesRepository.findDefault(tenantId);
        if (defaultWarehouse) {
          resolvedWarehouseId = defaultWarehouse.id as string;
        }
      }

      if (resolvedWarehouseId) {
        for (const item of items) {
          const itemData = item as unknown as Record<string, unknown>;
          const productId = itemData.productId as string | null;
          if (!productId) continue;

          const product = await this.productsRepository.findById(tenantId, productId);
          if (!product) continue;

          const productRecord = product as Record<string, unknown>;
          const productType = productRecord.productType;

          if (productType !== ProductType.STORABLE) continue;

          const quantity = parseFloat(String(itemData.quantity));

          try {
            await this.inventoryShared.createMovement(
              tenantId,
              {
                productId,
                warehouseId: resolvedWarehouseId!,
                movementType: StockMovementType.POS_SALE,
                quantity: -quantity,
                referenceId: orderId,
                referenceType: StockReferenceType.POS_ORDER,
              } as any,
              transaction,
            );
          } catch (stockErr) {
            // Re-throw as checkout validation error
            throw new BadRequestException((stockErr as Error).message);
          }
        }
      }

      // 7c1. Post COGS journal for storable items
      if (resolvedWarehouseId) {
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

          for (const item of items) {
            const itemData = item as unknown as Record<string, unknown>;
            const productId = itemData.productId as string | null;
            if (!productId) continue;

            const product = await this.productsRepository.findById(tenantId, productId);
            if (!product) continue;
            const productRecord = product as Record<string, unknown>;
            if (productRecord.productType !== ProductType.STORABLE) continue;

            const quantity = parseFloat(String(itemData.quantity));
            const stockLevels = await this.inventoryShared.getStockLevel(
              tenantId,
              productId,
              resolvedWarehouseId!,
            );
            const unitCost =
              stockLevels.length > 0 ? parseFloat(String(stockLevels[0].averageCost ?? 0)) : 0;
            totalCogs += quantity * unitCost;
          }

          if (totalCogs > 0) {
            try {
              await this.journalPosterService.post(
                tenantId,
                {
                  entryDate: new Date().toISOString().split('T')[0],
                  description: `COGS for POS order ${orderData.orderNumber}`,
                  referenceId: orderId,
                  referenceType: 'pos_order_cogs',
                  lines: [
                    {
                      accountId: cogsAccountId,
                      debit: totalCogs,
                      credit: 0,
                      description: `COGS: order ${orderData.orderNumber}`,
                    },
                    {
                      accountId: inventoryAccountId,
                      debit: 0,
                      credit: totalCogs,
                      description: `Inventory: order ${orderData.orderNumber}`,
                    },
                  ],
                },
                auditContext,
                transaction,
              );
            } catch (cogsErr) {
              // COGS posting must NEVER block checkout
              this.logger.warn(
                `COGS journal failed for order ${orderId}: ${(cogsErr as Error).message}`,
              );
            }
          }
        }
        // If COA keys not configured → skip COGS silently
      }

      // 7c2. Record voucher redemption
      if (voucherId) {
        await this.voucherGiftCard.redeemVoucher(
          voucherId,
          orderId,
          partnerId ?? null,
          voucherDiscountAmount,
          transaction,
        );
      }

      // 7d. Gift card redemption
      for (const payment of dto.payments.filter((p) => p.method === PaymentMethod.GIFT_CARD)) {
        if (!payment.giftCardCode) {
          throw new BadRequestException(msg(ErrorMessages.GIFT_CARD_NOT_FOUND, '(missing code)'));
        }
        const gcResult = await this.voucherGiftCard.redeemGiftCard(
          tenantId,
          payment.giftCardCode,
          payment.amount,
          orderId,
          transaction,
        );
        if (gcResult.remainingToPay > 0) {
          const available = payment.amount - gcResult.remainingToPay;
          throw new BadRequestException(
            msg(ErrorMessages.GIFT_CARD_INSUFFICIENT, available, payment.amount),
          );
        }
      }

      // 7e. Loyalty redeem — only if payments contain LOYALTY_POINTS
      const loyaltyPayment = dto.payments.find((p) => p.method === PaymentMethod.LOYALTY_POINTS);
      if (loyaltyPayment) {
        if (!partnerId) {
          throw new BadRequestException(msg(ErrorMessages.CUSTOMER_REQUIRED));
        }
        const redeemResult = await this.loyalty.redeem(
          tenantId,
          partnerId,
          orderId,
          loyaltyPayment.pointsToRedeem ?? 0,
          totalAmount,
          transaction,
        );
        if (redeemResult.sarValue !== loyaltyPayment.amount) {
          throw new BadRequestException(
            msg(ErrorMessages.PAYMENT_MISMATCH, loyaltyPayment.amount, redeemResult.sarValue),
          );
        }
      }

      // 7f. Loyalty earn — only if partner is attached (tip excluded from earn base per Odoo rule)
      if (partnerId) {
        const earnBase = Math.round((subtotal - orderDiscountAmount) * 100) / 100;
        await this.loyalty.earn(tenantId, partnerId, orderId, earnBase, transaction);
      }

      // 7g. Create simplified invoice (B2C) via InvoicesService
      let invoiceId: string | null = null;
      try {
        // Resolve session branchId for the invoice
        const sessionResult = await this.ordersRepository.rawQuery<{ branchId: string }[]>(
          `SELECT "branchId" FROM pos_sessions WHERE id = :sessionId AND "tenantId" = :tenantId LIMIT 1`,
          { sessionId: orderData.sessionId, tenantId },
          transaction,
        );
        const branchId =
          sessionResult && sessionResult.length > 0 ? sessionResult[0].branchId : null;

        if (branchId) {
          const invoiceLines = items.map((item) => {
            const d = item as unknown as Record<string, unknown>;
            const unitPrice = parseFloat(String(d.unitPrice ?? 0));
            const quantity = parseFloat(String(d.quantity ?? 0));
            const discountAmt = parseFloat(String(d.discountAmount ?? 0));
            const lineSubtotal = unitPrice * quantity;
            const discountPct = lineSubtotal > 0 ? (discountAmt / lineSubtotal) * 100 : 0;

            return {
              productId: (d.productId as string) ?? undefined,
              productVariantId: (d.productVariantId as string) ?? undefined,
              description: String(d.productName || 'POS Item'),
              quantity,
              unitPrice,
              discountPct: Math.round(discountPct * 100) / 100,
            };
          });

          const invoiceResult = await this.invoicesService.create(
            tenantId,
            {
              branchId,
              partnerId: partnerId ?? branchId, // walk-in: use branch as placeholder partner
              invoiceType: InvoiceTypeNew.OUT_INVOICE,
              invoiceDate: new Date().toISOString().split('T')[0],
              currencyId: resolvedCurrencyId,
              exchangeRate,
              reference: `POS-${orderData.orderNumber}`,
              narration: `POS simplified invoice for order ${orderData.orderNumber}`,
              lines: invoiceLines,
            },
            auditContext,
            transaction,
          );

          if (invoiceResult) {
            const invoiceRecord = invoiceResult as unknown as Record<string, unknown>;
            invoiceId = invoiceRecord.id as string;

            // Link invoice to the POS order
            await this.ordersRepository.update(orderId, { invoiceId } as any, {
              tenantId,
              transaction,
              auditContext,
            });

            // Post the invoice immediately (POS invoices are auto-posted)
            try {
              await this.invoicesService.post(tenantId, invoiceId, auditContext, transaction);
            } catch (postErr) {
              this.logger.warn(
                `Invoice posting failed for order ${orderId}: ${(postErr as Error).message}`,
              );
            }
          }
        }
      } catch (invoiceErr) {
        // Invoice creation should not block checkout — log and continue
        this.logger.warn(
          `Invoice creation failed for order ${orderId}: ${(invoiceErr as Error).message}`,
        );
      }

      if (isOwner) await transaction.commit();

      // Send receipt notification if partner is attached
      if (partnerId) {
        setImmediate(async () => {
          try {
            await this.notificationsService.createEvent(
              tenantId,
              'pos_checkout',
              {
                customerId: partnerId,
                orderNumber: String(orderData.orderNumber ?? ''),
                totalAmount,
                currencyCode: 'SAR',
              },
              orderId,
              'pos_order',
            );
          } catch (err) {
            this.logger.warn(
              `Receipt notification failed for order ${orderId}: ${(err as Error).message}`,
            );
          }
        });
      }

      // 8. Return complete paid order
      const paidOrder = await this.ordersRepository.findById(orderId, { tenantId });
      const paidItems = await this.orderItemsRepository.findAllRaw({
        where: { orderId: orderId },
        order: [['createdAt', 'ASC']],
      });
      const payments = await this.paymentsRepository.findAllRaw({
        where: { orderId: orderId },
        order: [['createdAt', 'ASC']],
      });

      return {
        ...(paidOrder as unknown as Record<string, unknown>),
        items: paidItems,
        payments,
        invoiceId,
      };
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }
}
