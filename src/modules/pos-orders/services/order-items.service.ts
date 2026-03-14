import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { PosOrderItemsRepository } from '@/database/sql/repositories/pos-order-items.repository';
import { PosOrdersRepository } from '@/database/sql/repositories/pos-orders.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { AddOrderItemDto } from '../dto/add-order-item.dto';
import { UpdateOrderItemDto } from '../dto/update-order-item.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PosOrderStatus } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class OrderItemsService {
  constructor(
    private readonly orderItemsRepository: PosOrderItemsRepository,
    private readonly ordersRepository: PosOrdersRepository,
    private readonly productsRepository: ProductsRepository,
  ) {}

  async addItem(
    tenantId: string,
    orderId: string,
    dto: AddOrderItemDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.orderItemsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const order = await this.ordersRepository.findById(orderId, { tenantId, transaction });
      const orderData = order as unknown as Record<string, unknown>;
      if (orderData.status !== PosOrderStatus.OPEN) {
        throw new BadRequestException(
          msg(ErrorMessages.ITEM_ORDER_NOT_OPEN, 'add', String(orderData.status)),
        );
      }

      const product = await this.productsRepository.findById(tenantId, dto.productId);
      if (!product) {
        throw new NotFoundException(msg(ErrorMessages.PRODUCT_NOT_FOUND, dto.productId));
      }

      const productData = product as Record<string, unknown>;
      const productName = String(productData.nameEn || productData.nameAr || '');
      const unitPrice = parseFloat(String(productData.unitPrice ?? 0));
      const taxRate = parseFloat(String(productData.taxRate ?? 15));

      const quantity = dto.quantity;
      const itemDiscount = dto.discountAmount ?? 0;
      const taxableAmount = unitPrice * quantity - itemDiscount;
      const itemTaxAmount = Math.round(((taxableAmount * taxRate) / 100) * 100) / 100;
      const lineTotal = Math.round((taxableAmount + itemTaxAmount) * 100) / 100;

      const item = await this.orderItemsRepository.create(
        {
          orderId,
          productId: dto.productId,
          productName,
          unitPrice,
          quantity,
          discountAmount: itemDiscount,
          taxRate,
          taxAmount: itemTaxAmount,
          lineTotal,
          course: dto.course ?? null,
          notes: dto.notes ?? null,
        } as any,
        { transaction },
      );

      await this.recalculateOrderTotals(tenantId, orderId, auditContext, transaction);

      if (isOwner) await transaction.commit();
      return item;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async updateItem(
    tenantId: string,
    orderId: string,
    itemId: string,
    dto: UpdateOrderItemDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.orderItemsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const order = await this.ordersRepository.findById(orderId, { tenantId, transaction });
      const orderData = order as unknown as Record<string, unknown>;
      if (orderData.status !== PosOrderStatus.OPEN) {
        throw new BadRequestException(
          msg(ErrorMessages.ITEM_ORDER_NOT_OPEN, 'update', String(orderData.status)),
        );
      }

      const existingItem = await this.orderItemsRepository.findOne({
        where: { id: itemId, orderId: orderId },
        transaction,
      });
      if (!existingItem) {
        throw new NotFoundException(msg(ErrorMessages.ITEM_NOT_FOUND, itemId, orderId));
      }

      const itemData = existingItem as unknown as Record<string, unknown>;
      const quantity = dto.quantity ?? parseFloat(String(itemData.quantity));
      const unitPrice = parseFloat(String(itemData.unitPrice));
      const taxRate = parseFloat(String(itemData.taxRate));
      const itemDiscount = dto.discountAmount ?? parseFloat(String(itemData.discountAmount ?? 0));

      const taxableAmount = unitPrice * quantity - itemDiscount;
      const itemTaxAmount = Math.round(((taxableAmount * taxRate) / 100) * 100) / 100;
      const lineTotal = Math.round((taxableAmount + itemTaxAmount) * 100) / 100;

      await this.orderItemsRepository.rawQuery(
        `UPDATE pos_order_items
         SET quantity = :quantity,
             "discountAmount" = :discountAmount,
             "taxAmount" = :taxAmount,
             "lineTotal" = :lineTotal,
             course = :course,
             notes = :notes
         WHERE id = :itemId AND "orderId" = :orderId`,
        {
          quantity,
          discountAmount: itemDiscount,
          taxAmount: itemTaxAmount,
          lineTotal,
          course: dto.course !== undefined ? dto.course : (itemData.course ?? null),
          notes: dto.notes !== undefined ? dto.notes : (itemData.notes ?? null),
          itemId,
          orderId,
        },
        transaction,
      );

      await this.recalculateOrderTotals(tenantId, orderId, auditContext, transaction);

      if (isOwner) await transaction.commit();

      return this.orderItemsRepository.findOne({
        where: { id: itemId, orderId: orderId },
      });
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async removeItem(
    tenantId: string,
    orderId: string,
    itemId: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.orderItemsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const order = await this.ordersRepository.findById(orderId, { tenantId, transaction });
      const orderData = order as unknown as Record<string, unknown>;
      if (orderData.status !== PosOrderStatus.OPEN) {
        throw new BadRequestException(
          msg(ErrorMessages.ITEM_ORDER_NOT_OPEN, 'remove', String(orderData.status)),
        );
      }

      const existingItem = await this.orderItemsRepository.findOne({
        where: { id: itemId, orderId: orderId },
        transaction,
      });
      if (!existingItem) {
        throw new NotFoundException(msg(ErrorMessages.ITEM_NOT_FOUND, itemId, orderId));
      }

      await this.orderItemsRepository.rawQuery(
        `DELETE FROM pos_order_items WHERE id = :itemId AND "orderId" = :orderId`,
        { itemId, orderId },
        transaction,
      );

      await this.recalculateOrderTotals(tenantId, orderId, auditContext, transaction);

      if (isOwner) await transaction.commit();
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async getItemsByOrderId(orderId: string): Promise<unknown[]> {
    return this.orderItemsRepository.findAllRaw({
      where: { orderId: orderId },
      order: [['createdAt', 'ASC']],
    });
  }

  async recalculateOrderTotals(
    tenantId: string,
    orderId: string,
    auditContext: AuditContext,
    transaction: Transaction,
  ): Promise<void> {
    const items = await this.orderItemsRepository.findAllRaw({
      where: { orderId: orderId },
      transaction,
    });

    let subtotal = 0;
    for (const item of items) {
      const data = item as unknown as Record<string, unknown>;
      const unitPrice = parseFloat(String(data.unitPrice ?? 0));
      const quantity = parseFloat(String(data.quantity ?? 0));
      const itemDiscount = parseFloat(String(data.discountAmount ?? 0));
      subtotal += unitPrice * quantity - itemDiscount;
    }
    subtotal = Math.round(subtotal * 100) / 100;

    const order = await this.ordersRepository.findById(orderId, { tenantId, transaction });
    const orderData = order as unknown as Record<string, unknown>;
    const discountAmount = parseFloat(String(orderData.discountAmount ?? 0));
    const tipAmount = parseFloat(String(orderData.tipAmount ?? 0));
    const deliveryFee = parseFloat(String(orderData.deliveryFee ?? 0));

    const taxAmount = Math.round((((subtotal - discountAmount) * 15) / 100) * 100) / 100;
    const totalAmount =
      Math.round((subtotal - discountAmount + taxAmount + tipAmount + deliveryFee) * 100) / 100;

    await this.ordersRepository.update(
      orderId,
      {
        subtotal,
        taxAmount,
        totalAmount,
      } as any,
      { tenantId, transaction, auditContext },
    );
  }
}
