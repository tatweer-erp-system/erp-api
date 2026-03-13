import { BadRequestException, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { PosOrdersRepository } from '@/database/sql/repositories/pos-orders.repository';
import { PosOrderItemsRepository } from '@/database/sql/repositories/pos-order-items.repository';
import { PosPaymentsRepository } from '@/database/sql/repositories/pos-payments.repository';
import { StockLevelsRepository } from '@/database/sql/repositories/stock-levels.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { WarehousesRepository } from '@/database/sql/repositories/warehouses.repository';
import { CheckoutDto } from '../dto/checkout.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PosOrderStatus, DiscountType, PaymentMethod, ProductType } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { VAT_RATE } from '@/common/constants/pos.constants';

const VOUCHERS_SERVICE = 'VouchersService';

@Injectable()
export class PosCheckoutService {
  private readonly logger = new Logger(PosCheckoutService.name);

  constructor(
    private readonly ordersRepository: PosOrdersRepository,
    private readonly orderItemsRepository: PosOrderItemsRepository,
    private readonly paymentsRepository: PosPaymentsRepository,
    private readonly stockLevelsRepository: StockLevelsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly warehousesRepository: WarehousesRepository,
    @Optional() @Inject(VOUCHERS_SERVICE) private readonly vouchersService: any | null,
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

      // 2. Validate customer requirement for voucher/loyalty
      const hasVoucher = !!dto.voucherCode;
      const hasLoyaltyPayment = dto.payments.some((p) => p.method === PaymentMethod.LOYALTY_POINTS);
      const customerId = orderData.customerId;

      if ((hasVoucher || hasLoyaltyPayment) && !customerId) {
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
      if (dto.voucherCode) {
        if (!this.vouchersService) {
          throw new BadRequestException(msg(ErrorMessages.VOUCHER_MODULE_NOT_WIRED));
        }
        const customerId = orderData.customerId ?? undefined;
        const voucherResult = await this.vouchersService.validate(tenantId, {
          code: dto.voucherCode,
          orderTotal: subtotal,
          customerId,
        });
        if (!voucherResult.valid) {
          throw new BadRequestException(voucherResult.error || 'Voucher is not valid');
        }
      }

      // 5. Recalculate final totals
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
          `Payment total (${roundedPaymentTotal}) does not match order total (${totalAmount})`,
        );
      }

      // Validate cash payments
      for (const payment of dto.payments) {
        if (payment.method === PaymentMethod.CASH) {
          if (payment.amountGiven !== undefined && payment.amountGiven < payment.amount) {
            throw new BadRequestException(
              'Cash amount given must be greater than or equal to the payment amount',
            );
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
          } as any,
          { transaction },
        );
      }

      // 7c. Stock deduction for storable products
      if (dto.warehouseId) {
        const warehouse = await this.warehousesRepository.findById(tenantId, dto.warehouseId);
        if (!warehouse) {
          throw new BadRequestException(
            msg(ErrorMessages.WAREHOUSE_NOT_FOUND, dto.warehouseId ?? ''),
          );
        }
        const warehouseData = warehouse as Record<string, unknown>;
        const allowNegativeStock = warehouseData.allowNegativeStock;

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

          if (!allowNegativeStock) {
            const stockRow = await this.stockLevelsRepository.findByProductAndWarehouse(
              tenantId,
              productId,
              dto.warehouseId,
              transaction,
            );
            const currentStock = stockRow ? parseFloat(String(stockRow.quantity)) : 0;

            if (currentStock < quantity) {
              const pName = itemData.productName;
              throw new BadRequestException(
                `Insufficient stock for product "${pName}". Available: ${currentStock}, Required: ${quantity}`,
              );
            }
          }

          await this.ordersRepository.rawQuery(
            `UPDATE stock_levels
             SET quantity = quantity - :qty
             WHERE "productId" = :productId
               AND "warehouseId" = :warehouseId
               AND "tenantId" = :tenantId`,
            {
              qty: quantity,
              productId,
              warehouseId: dto.warehouseId,
              tenantId,
            },
            transaction,
          );
        }
      }

      if (isOwner) await transaction.commit();

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
      };
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }
}
