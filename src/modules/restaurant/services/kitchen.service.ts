import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { KitchenTicketsRepository } from '@/database/sql/repositories/kitchen-tickets.repository';
import { PosOrderItemsRepository } from '@/database/sql/repositories/pos-order-items.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { FireCourseDto } from '../dto/fire-course.dto';
import { UpdateTicketStatusDto } from '../dto/update-ticket-status.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { KitchenTicketStatus, ProductType } from '@/common/enums/pos.enums';
import { KitchenItem } from '@/database/sql/entities/kitchen-ticket.entity';

@Injectable()
export class KitchenService {
  private readonly logger = new Logger(KitchenService.name);

  constructor(
    private readonly kitchenTicketsRepository: KitchenTicketsRepository,
    private readonly orderItemsRepository: PosOrderItemsRepository,
    private readonly productsRepository: ProductsRepository,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const { page = 1, limit = 20, sortOrder = 'DESC' } = query;
    return this.kitchenTicketsRepository.findAll({
      tenantId,
      page,
      limit,
      sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    const ticket = await this.kitchenTicketsRepository.findByIdOrNull(id, { tenantId });
    if (!ticket) {
      throw new NotFoundException(msg(ErrorMessages.KITCHEN_TICKET_NOT_FOUND, id));
    }
    return ticket;
  }

  async fireCourse(
    tenantId: string,
    dto: FireCourseDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.kitchenTicketsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // Load all requested order items
      const orderItems = await this.orderItemsRepository.findAllRaw({
        bypassTenantScope: true,
        where: { orderId: dto.orderId },
        transaction,
      });

      // Filter to only the requested IDs
      const requestedItems = orderItems.filter((item) =>
        dto.orderItemIds.includes(String((item as any).id)),
      );

      if (requestedItems.length === 0) {
        throw new BadRequestException(msg(ErrorMessages.KITCHEN_NO_VALID_ITEMS, dto.orderId));
      }

      // Build JSONB snapshot — exclude SERVICE type products
      const kitchenItems: KitchenItem[] = [];

      for (const item of requestedItems) {
        const itemData = item as unknown as Record<string, unknown>;
        const productId = itemData['productId'] as string | null;
        const productName = itemData['productName'] as string;
        let name: { en: string; ar: string } = { en: productName, ar: productName };

        if (productId) {
          const product = await this.productsRepository.findById(tenantId, productId);

          if (product) {
            // Skip service products — they do not appear on kitchen tickets
            if ((product as any).productType === ProductType.SERVICE) {
              continue;
            }

            // Resolve bilingual name from product
            name = {
              en: (product as any).nameEn ?? productName,
              ar: (product as any).nameAr ?? productName,
            };
          }
        }

        const kitchenItem: KitchenItem = {
          productId: productId ?? '',
          name,
          quantity: parseFloat(String(itemData['quantity'] ?? 1)),
          notes: itemData['notes'] ? String(itemData['notes']) : undefined,
        };

        kitchenItems.push(kitchenItem);
      }

      // Create kitchen ticket
      const ticket = await this.kitchenTicketsRepository.create(
        {
          tenantId,
          orderId: dto.orderId,
          course: dto.course,
          status: KitchenTicketStatus.PENDING,
          items: kitchenItems,
          station: null,
          priority: 0,
          sentAt: new Date(),
          startedAt: null,
          completedAt: null,
        } as any,
        { tenantId, auditContext, transaction },
      );

      // Mark all requested order items as fired
      const now = new Date();
      for (const item of requestedItems) {
        const itemId = (item as any).id;
        await this.orderItemsRepository.update(itemId, { isFired: true, firedAt: now } as any, {
          transaction,
        });
      }

      if (isOwner) await transaction.commit();
      return ticket;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateTicketStatusDto,
    auditContext: AuditContext,
  ) {
    const ticket = await this.kitchenTicketsRepository.findByIdOrNull(id, { tenantId });
    if (!ticket) {
      throw new NotFoundException(msg(ErrorMessages.KITCHEN_TICKET_NOT_FOUND, id));
    }

    const updates: Record<string, unknown> = { status: dto.status };

    // Update timestamps based on lifecycle transitions
    if (dto.status === KitchenTicketStatus.PREPARING) {
      updates['startedAt'] = new Date();
    } else if (
      dto.status === KitchenTicketStatus.READY ||
      dto.status === KitchenTicketStatus.SERVED
    ) {
      updates['completedAt'] = new Date();
    }

    return this.kitchenTicketsRepository.update(id, updates as any, { tenantId, auditContext });
  }

  async cancel(tenantId: string, id: string, auditContext: AuditContext) {
    const ticket = await this.kitchenTicketsRepository.findByIdOrNull(id, { tenantId });
    if (!ticket) {
      throw new NotFoundException(msg(ErrorMessages.KITCHEN_TICKET_NOT_FOUND, id));
    }

    if ((ticket as any).status === KitchenTicketStatus.CANCELLED) {
      throw new BadRequestException(msg(ErrorMessages.KITCHEN_TICKET_ALREADY_CANCELLED, id));
    }

    await this.kitchenTicketsRepository.update(
      id,
      { status: KitchenTicketStatus.CANCELLED } as any,
      { tenantId, auditContext },
    );
  }
}
