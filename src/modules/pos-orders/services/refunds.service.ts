import { BadRequestException, Injectable } from '@nestjs/common';
import { PosOrdersRepository } from '@/database/sql/repositories/pos-orders.repository';
import { PosOrderItemsRepository } from '@/database/sql/repositories/pos-order-items.repository';
import { PosRefundsRepository } from '@/database/sql/repositories/pos-refunds.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { RefundOrderDto } from '../dto/refund-order.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { PosOrderStatus, OrderType, ProductType } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class RefundsService {
  constructor(
    private readonly ordersRepository: PosOrdersRepository,
    private readonly orderItemsRepository: PosOrderItemsRepository,
    private readonly refundsRepository: PosRefundsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly sequencesService: SequencesService,
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

    const transaction = await this.ordersRepository.createTransaction();

    try {
      const items = await this.orderItemsRepository.findAllRaw({
        where: { orderId: orderId },
        transaction,
      });

      const sessionId = orderData.sessionId;
      const refundOrderNumber = await this.sequencesService.nextNumber(tenantId, 'pos_order');

      // 1. Create refund order with negative amounts
      const subtotal = -parseFloat(String(orderData.subtotal ?? 0));
      const discountAmount = -parseFloat(String(orderData.discountAmount ?? 0));
      const taxAmount = -parseFloat(String(orderData.taxAmount ?? 0));
      const tipAmount = -parseFloat(String(orderData.tipAmount ?? 0));
      const totalAmount = -parseFloat(String(orderData.totalAmount ?? 0));
      const deliveryFee = -parseFloat(String(orderData.deliveryFee ?? 0));

      const refundOrder = await this.ordersRepository.create(
        {
          sessionId,
          orderNumber: refundOrderNumber,
          customerId: orderData.customerId ?? null,
          orderType: orderData.orderType ?? OrderType.TAKEAWAY,
          status: PosOrderStatus.REFUNDED,
          subtotal,
          discountAmount,
          taxAmount,
          tipAmount,
          totalAmount,
          deliveryFee,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const refundOrderData = refundOrder as unknown as Record<string, unknown>;
      const refundOrderId = refundOrderData.id as string;

      // 2. Copy items with negative quantities
      if (items.length > 0) {
        const refundItems = items.map((item) => {
          const data = item as unknown as Record<string, unknown>;
          return {
            orderId: refundOrderId,
            productId: data.productId ?? null,
            productName: data.productName,
            unitPrice: data.unitPrice,
            quantity: -parseFloat(String(data.quantity)),
            discountAmount: -parseFloat(String(data.discountAmount ?? 0)),
            taxRate: data.taxRate,
            taxAmount: -parseFloat(String(data.taxAmount ?? 0)),
            lineTotal: -parseFloat(String(data.lineTotal ?? 0)),
            course: data.course ?? null,
            notes: data.notes ?? null,
          };
        });

        await this.orderItemsRepository.bulkCreate({
          data: refundItems,
          transaction,
        });
      }

      // 3. Create refund record
      await this.refundsRepository.create(
        {
          originalOrderId: orderId,
          refundOrderId,
          refundType: dto.refundType,
          totalRefunded: Math.abs(totalAmount),
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

      // 5. Restore stock for storable products
      if (dto.warehouseId) {
        for (const item of items) {
          const data = item as unknown as Record<string, unknown>;
          const productId = data.productId as string | null;
          if (!productId) continue;

          const product = await this.productsRepository.findById(tenantId, productId);
          if (!product) continue;

          const productRecord = product as Record<string, unknown>;
          const productType = productRecord.productType;
          if (productType !== ProductType.STORABLE) continue;

          const quantity = parseFloat(String(data.quantity));

          await this.ordersRepository.rawQuery(
            `UPDATE stock_levels
             SET quantity = quantity + :qty
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
