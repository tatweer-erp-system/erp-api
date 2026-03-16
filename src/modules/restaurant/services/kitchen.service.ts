import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { KitchenTicketsRepository } from '@/database/sql/repositories/kitchen-tickets.repository';
import { PosOrderItemsRepository } from '@/database/sql/repositories/pos-order-items.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { FireCourseDto } from '../dto/fire-course.dto';
import { UpdateTicketStatusDto } from '../dto/update-ticket-status.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { KitchenTicketStatus } from '@/common/enums/restaurant.enums';
import { KitchenItem } from '@/database/sql/entities/kitchen-ticket.entity';
import { ProductType } from '@/common/enums/pos.enums';

@Injectable()
export class KitchenService {
  private readonly logger = new Logger(KitchenService.name);

  constructor(
    private readonly kitchenTicketsRepository: KitchenTicketsRepository,
    private readonly orderItemsRepository: PosOrderItemsRepository,
    private readonly productsRepository: ProductsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findAll(branchId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    return this.kitchenTicketsRepository.findAll(branchId, {}, page, limit);
  }

  async findById(branchId: string, id: string) {
    const ticket = await this.kitchenTicketsRepository.findByIdOrNull(id);
    if (!ticket) {
      throw new NotFoundException(msg(ErrorMessages.KITCHEN_TICKET_NOT_FOUND, id));
    }
    return ticket;
  }

  async fireCourse(
    branchId: string,
    dto: FireCourseDto,
    _auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    return this.dataSource.transaction(async (_manager) => {
      // Load all order items for this order
      const allItems = await this.orderItemsRepository.findAllRaw({
        where: { orderId: (dto as any).orderId },
      });

      // Filter to only the requested IDs
      const requestedItems = allItems.filter((item: any) =>
        (dto as any).orderItemIds.includes(String(item.id)),
      );

      if (requestedItems.length === 0) {
        throw new BadRequestException(
          msg(ErrorMessages.KITCHEN_NO_VALID_ITEMS, (dto as any).orderId),
        );
      }

      // Build JSONB snapshot — exclude SERVICE type products
      const kitchenItems: KitchenItem[] = [];

      for (const item of requestedItems) {
        const productId: string | null = (item as any).productId ?? null;
        const productName: string = (item as any).productName ?? '';
        let name: { en: string; ar: string } = { en: productName, ar: productName };

        if (productId) {
          const product = await this.productsRepository.findById(productId);

          if (product) {
            // Skip service products — they do not appear on kitchen tickets
            if ((product as any).productType === ProductType.SERVICE) {
              continue;
            }

            name = {
              en: (product as any).nameEn ?? productName,
              ar: (product as any).nameAr ?? productName,
            };
          }
        }

        kitchenItems.push({
          productId: productId ?? '',
          name,
          quantity: parseFloat(String((item as any).quantity ?? 1)),
          notes: (item as any).notes ? String((item as any).notes) : undefined,
        });
      }

      // Get next ticket number for this branch
      const lastTicket = await this.kitchenTicketsRepository.findAll(branchId, {}, 1, 1);
      const ticketNumber = (lastTicket.total ?? 0) + 1;

      // Create kitchen ticket
      const ticket = await this.kitchenTicketsRepository.create({
        branchId,
        orderId: (dto as any).orderId,
        tableId: (dto as any).tableId ?? null,
        courseType: (dto as any).course ?? null,
        status: KitchenTicketStatus.PENDING,
        items: kitchenItems,
        firedAt: new Date(),
        readyAt: null,
        servedAt: null,
        ticketNumber,
      });

      return ticket;
    });
  }

  async updateStatus(
    branchId: string,
    id: string,
    dto: UpdateTicketStatusDto,
    _auditContext: AuditContext,
  ) {
    const ticket = await this.kitchenTicketsRepository.findByIdOrNull(id);
    if (!ticket) {
      throw new NotFoundException(msg(ErrorMessages.KITCHEN_TICKET_NOT_FOUND, id));
    }

    const updates: Partial<typeof ticket> = { status: (dto as any).status };

    // Update timestamps based on lifecycle transitions
    if ((dto as any).status === KitchenTicketStatus.IN_PROGRESS) {
      // no-op: readyAt is set on READY
    } else if ((dto as any).status === KitchenTicketStatus.READY) {
      updates.readyAt = new Date();
    } else if ((dto as any).status === KitchenTicketStatus.SERVED) {
      updates.servedAt = new Date();
    }

    return this.kitchenTicketsRepository.update(id, updates);
  }

  async cancel(branchId: string, id: string, _auditContext: AuditContext) {
    const ticket = await this.kitchenTicketsRepository.findByIdOrNull(id);
    if (!ticket) {
      throw new NotFoundException(msg(ErrorMessages.KITCHEN_TICKET_NOT_FOUND, id));
    }

    if (ticket.status === KitchenTicketStatus.CANCELLED) {
      throw new BadRequestException(msg(ErrorMessages.KITCHEN_TICKET_ALREADY_CANCELLED, id));
    }

    await this.kitchenTicketsRepository.updateStatus(id, KitchenTicketStatus.CANCELLED);
  }
}
