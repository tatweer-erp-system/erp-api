import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PosOrdersRepository } from '@/database/sql/repositories/pos-orders.repository';
import { PosOrderItemsRepository } from '@/database/sql/repositories/pos-order-items.repository';
import { PosPaymentsRepository } from '@/database/sql/repositories/pos-payments.repository';
import { PosHeldOrdersRepository } from '@/database/sql/repositories/pos-held-orders.repository';
import { PosSessionsRepository } from '@/database/sql/repositories/pos-sessions.repository';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { HoldOrderDto } from '../dto/hold-order.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { OrderItemsService } from './order-items.service';
import { PosOrderStatus, OrderType } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { MAX_HELD_ORDERS } from '@/common/constants/pos.constants';

@Injectable()
export class PosOrdersService {
  constructor(
    private readonly ordersRepository: PosOrdersRepository,
    private readonly orderItemsRepository: PosOrderItemsRepository,
    private readonly paymentsRepository: PosPaymentsRepository,
    private readonly heldOrdersRepository: PosHeldOrdersRepository,
    private readonly sessionsRepository: PosSessionsRepository,
    private readonly sequencesService: SequencesService,
    private readonly orderItemsService: OrderItemsService,
  ) {}

  async create(tenantId: string, dto: CreateOrderDto, auditContext: AuditContext) {
    const session = await this.sessionsRepository.findOne({
      where: { cashierId: auditContext.userId, status: PosOrderStatus.OPEN },
      tenantId,
    });
    if (!session) {
      throw new BadRequestException(msg(ErrorMessages.SESSION_NOT_OPEN));
    }

    const sessionData = session as unknown as Record<string, unknown>;
    const sessionId = sessionData.id as string;

    const orderNumber = await this.sequencesService.nextNumber(tenantId, 'pos_order');

    const order = await this.ordersRepository.create(
      {
        sessionId,
        orderNumber,
        customerId: dto.customerId ?? null,
        tableId: dto.tableId ?? null,
        orderType: dto.orderType ?? OrderType.TAKEAWAY,
        status: PosOrderStatus.OPEN,
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        tipAmount: 0,
        totalAmount: 0,
        deliveryAddress: dto.deliveryAddress ?? null,
        deliveryFee: 0,
        pricelistId: dto.pricelistId ?? null,
      } as any,
      { tenantId, auditContext },
    );

    return order;
  }

  async findAll(tenantId: string, pagination: PaginationDto) {
    return this.ordersRepository.findAll({
      tenantId,
      page: pagination.page,
      limit: pagination.limit,
      search: pagination.search,
      searchFields: ['orderNumber'],
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    const order = await this.ordersRepository.findById(id, { tenantId });
    const items = await this.orderItemsService.getItemsByOrderId(id);
    const payments = await this.paymentsRepository.findAllRaw({
      where: { orderId: id },
      order: [['createdAt', 'ASC']],
    });

    return {
      ...(order as unknown as Record<string, unknown>),
      items,
      payments,
    };
  }

  async update(tenantId: string, id: string, dto: UpdateOrderDto, auditContext: AuditContext) {
    const order = await this.ordersRepository.findById(id, { tenantId });
    const orderData = order as unknown as Record<string, unknown>;

    if (orderData.status !== PosOrderStatus.OPEN) {
      throw new BadRequestException(msg(ErrorMessages.ORDER_NOT_OPEN, String(orderData.status)));
    }

    const currentVersion = orderData.version as number;
    if (currentVersion !== dto.version) {
      throw new BadRequestException(msg(ErrorMessages.ORDER_VERSION_CONFLICT));
    }

    const updateData: Record<string, unknown> = {};
    if (dto.orderType !== undefined) updateData.orderType = dto.orderType;
    if (dto.customerId !== undefined) updateData.customerId = dto.customerId;
    if (dto.tableId !== undefined) updateData.tableId = dto.tableId;
    if (dto.deliveryAddress !== undefined) updateData.deliveryAddress = dto.deliveryAddress;
    if (dto.deliveryFee !== undefined) updateData.deliveryFee = dto.deliveryFee;
    if (dto.pricelistId !== undefined) updateData.pricelistId = dto.pricelistId;

    await this.ordersRepository.update(id, updateData as any, {
      tenantId,
      auditContext,
    });

    if (dto.deliveryFee !== undefined) {
      const transaction = await this.ordersRepository.createTransaction();
      try {
        await this.orderItemsService.recalculateOrderTotals(
          tenantId,
          id,
          auditContext,
          transaction,
        );
        await transaction.commit();
      } catch (e) {
        await transaction.rollback();
        throw e;
      }
    }

    return this.findById(tenantId, id);
  }

  async voidOrder(tenantId: string, id: string, auditContext: AuditContext) {
    const order = await this.ordersRepository.findById(id, { tenantId });
    const orderData = order as unknown as Record<string, unknown>;

    if (orderData.status !== PosOrderStatus.OPEN) {
      throw new BadRequestException(msg(ErrorMessages.ORDER_CANT_VOID, String(orderData.status)));
    }

    await this.ordersRepository.update(id, { status: PosOrderStatus.VOIDED } as any, {
      tenantId,
      auditContext,
    });
  }

  async holdOrder(
    tenantId: string,
    orderId: string,
    dto: HoldOrderDto,
    auditContext: AuditContext,
  ) {
    const order = await this.ordersRepository.findById(orderId, { tenantId });
    const orderData = order as unknown as Record<string, unknown>;

    if (orderData.status !== PosOrderStatus.OPEN) {
      throw new BadRequestException(msg(ErrorMessages.ORDER_CANT_HOLD, String(orderData.status)));
    }

    const sessionId = orderData.sessionId;

    const heldCount = await this.heldOrdersRepository.count({
      where: { sessionId: sessionId },
      tenantId,
    });
    if (heldCount >= MAX_HELD_ORDERS) {
      throw new BadRequestException(msg(ErrorMessages.MAX_HELD_ORDERS, MAX_HELD_ORDERS));
    }

    const items = await this.orderItemsService.getItemsByOrderId(orderId);

    const transaction = await this.ordersRepository.createTransaction();

    try {
      await this.heldOrdersRepository.create(
        {
          sessionId,
          tabLabel: dto.tabLabel,
          cartSnapshot: items,
          createdBy: auditContext.userId,
        } as any,
        { tenantId, transaction },
      );

      await this.ordersRepository.update(orderId, { status: PosOrderStatus.VOIDED } as any, {
        tenantId,
        transaction,
        auditContext,
      });

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  async listHeldOrders(tenantId: string, userId: string) {
    const session = await this.sessionsRepository.findOne({
      where: { cashierId: userId, status: PosOrderStatus.OPEN },
      tenantId,
    });
    if (!session) {
      return { data: [] };
    }

    const sessionData = session as unknown as Record<string, unknown>;
    const heldOrders = await this.heldOrdersRepository.findAllRaw({
      where: { sessionId: sessionData.id },
      tenantId,
      order: [['createdAt', 'DESC']],
    });

    return { data: heldOrders };
  }

  async resumeHeldOrder(tenantId: string, heldOrderId: string, auditContext: AuditContext) {
    const heldOrder = await this.heldOrdersRepository.findById(heldOrderId, { tenantId });
    const heldData = heldOrder as unknown as Record<string, unknown>;
    const sessionId = heldData.sessionId;
    const cartSnapshot = heldData.cartSnapshot;

    const session = await this.sessionsRepository.findOne({
      where: { cashierId: auditContext.userId, status: PosOrderStatus.OPEN },
      tenantId,
    });
    if (!session) {
      throw new BadRequestException(msg(ErrorMessages.SESSION_NOT_OPEN));
    }

    const transaction = await this.ordersRepository.createTransaction();

    try {
      const orderNumber = await this.sequencesService.nextNumber(tenantId, 'pos_order');

      const order = await this.ordersRepository.create(
        {
          sessionId,
          orderNumber,
          status: PosOrderStatus.OPEN,
          orderType: OrderType.TAKEAWAY,
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          tipAmount: 0,
          totalAmount: 0,
          deliveryFee: 0,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const orderData = order as unknown as Record<string, unknown>;
      const newOrderId = orderData.id as string;
      const items = cartSnapshot as Record<string, unknown>[];

      if (items && items.length > 0) {
        const itemRecords = items.map((item) => ({
          orderId: newOrderId,
          productId: (item.productId as string | null) ?? null,
          productName: item.productName as string | null,
          unitPrice: item.unitPrice as number,
          quantity: item.quantity as number,
          discountAmount: (item.discountAmount as number) ?? 0,
          taxRate: (item.taxRate as number) ?? 15,
          taxAmount: (item.taxAmount as number) ?? 0,
          lineTotal: (item.lineTotal as number) ?? 0,
          course: (item.course as string | null) ?? null,
          notes: (item.notes as string | null) ?? null,
        }));

        await this.orderItemsRepository.bulkCreate({
          data: itemRecords,
          transaction,
        });
      }

      await this.orderItemsService.recalculateOrderTotals(
        tenantId,
        newOrderId,
        auditContext,
        transaction,
      );

      await this.heldOrdersRepository.hardDelete(heldOrderId, { tenantId, transaction });

      await transaction.commit();

      return this.findById(tenantId, newOrderId);
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
}
