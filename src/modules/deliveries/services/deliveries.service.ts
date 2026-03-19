import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DeliveriesRepository } from '@/database/sql/repositories/deliveries.repository';
import { DeliveryLinesRepository } from '@/database/sql/repositories/delivery-lines.repository';
import { InventorySharedService } from '@/shared/services/inventory-shared.service';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { WarehousesRepository } from '@/database/sql/repositories/warehouses.repository';
import { CreateDeliveryDto } from '../dto/create-delivery.dto';
import { UpdateDeliveryDto } from '../dto/update-delivery.dto';
import { DeliveryQueryDto } from '../dto/delivery-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { DeliveryStatus } from '@/common/enums/inventory-new.enums';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

const ENTITY_NAME = 'Delivery';
const ENTITY_TABLE = 'deliveries';

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly deliveriesRepository: DeliveriesRepository,
    private readonly deliveryLinesRepository: DeliveryLinesRepository,
    private readonly inventoryService: InventorySharedService,
    private readonly auditService: AuditSharedService,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly outboxService: OutboxSharedService,
    private readonly sequencesService: SequencesService,
    private readonly warehousesRepository: WarehousesRepository,
  ) {
    this.statusTransitionService.registerTransitions('delivery', [
      { from: DeliveryStatus.DRAFT, to: DeliveryStatus.READY },
      { from: DeliveryStatus.READY, to: DeliveryStatus.DONE },
      { from: [DeliveryStatus.DRAFT, DeliveryStatus.READY], to: DeliveryStatus.CANCELLED },
    ]);
  }

  async getSummary(tenantId: string) {
    return this.deliveriesRepository.getSummary(tenantId);
  }

  async findAll(tenantId: string, query: DeliveryQueryDto) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.deliveriesRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search: query.search,
      sortOrder: query.sortOrder || 'DESC',
      status: query.status,
      saleOrderId: query.saleOrderId,
      partnerId: query.partnerId,
      branchId: query.branchId,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const delivery = await this.deliveriesRepository.findOneWithLines(tenantId, id);
    if (!delivery) {
      throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, ENTITY_NAME, id));
    }
    return delivery;
  }

  async create(tenantId: string, dto: CreateDeliveryDto, auditContext: AuditContext) {
    const transaction = await this.deliveriesRepository.getTransaction();

    try {
      const reference = await this.sequencesService.nextNumber(tenantId, 'delivery', dto.branchId);

      const deliveryId = await this.deliveriesRepository.insertDelivery(
        tenantId,
        {
          branchId: dto.branchId,
          reference,
          saleOrderId: dto.saleOrderId ?? null,
          partnerId: dto.partnerId,
          status: DeliveryStatus.DRAFT,
          scheduledDate: dto.scheduledDate ?? null,
          responsibleId: dto.responsibleId ?? null,
          notes: dto.notes ?? null,
          createdBy: auditContext.userId ?? null,
        },
        transaction,
      );

      for (const line of dto.lines) {
        await this.deliveryLinesRepository.insertLine(
          tenantId,
          {
            branchId: dto.branchId,
            deliveryId,
            productId: line.productId,
            saleOrderLineId: line.saleOrderLineId ?? null,
            productVariantId: line.productVariantId ?? null,
            qtyDemand: line.qtyDemand,
            qtyDone: line.qtyDone ?? 0,
            unitOfMeasureId: line.unitOfMeasureId ?? null,
            locationId: line.locationId ?? null,
            lotNumber: line.lotNumber ?? null,
            serialNumber: line.serialNumber ?? null,
            createdBy: auditContext.userId ?? null,
          },
          transaction,
        );
      }

      await transaction.commit();

      await this.auditService.logCreate(
        tenantId,
        ENTITY_TABLE,
        deliveryId,
        dto as unknown as Record<string, unknown>,
        auditContext.userId,
      );

      return this.findById(tenantId, deliveryId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateDeliveryDto, auditContext: AuditContext) {
    const existing = await this.deliveriesRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, ENTITY_NAME, id));
    }

    if (existing.status !== DeliveryStatus.DRAFT) {
      throw new BadRequestException(
        `${ENTITY_NAME} can only be updated in draft status — current status is "${existing.status}"`,
      );
    }

    if (existing.version !== dto.version) {
      throw new ConflictException(
        msg(ErrorMessages.VERSION_CONFLICT, dto.version, existing.version),
      );
    }

    const transaction = await this.deliveriesRepository.getTransaction();

    try {
      const updates: string[] = [];
      const replacements: Record<string, unknown> = {};

      if (dto.saleOrderId !== undefined) {
        updates.push('"saleOrderId" = :saleOrderId');
        replacements.saleOrderId = dto.saleOrderId;
      }
      if (dto.partnerId !== undefined) {
        updates.push('"partnerId" = :partnerId');
        replacements.partnerId = dto.partnerId;
      }
      if (dto.scheduledDate !== undefined) {
        updates.push('"scheduledDate" = :scheduledDate');
        replacements.scheduledDate = dto.scheduledDate;
      }
      if (dto.responsibleId !== undefined) {
        updates.push('"responsibleId" = :responsibleId');
        replacements.responsibleId = dto.responsibleId;
      }
      if (dto.notes !== undefined) {
        updates.push('notes = :notes');
        replacements.notes = dto.notes;
      }

      if (updates.length > 0) {
        updates.push('"updatedBy" = :updatedBy');
        replacements.updatedBy = auditContext.userId ?? null;
        updates.push('"updatedAt" = NOW()');
        updates.push('version = version + 1');

        await this.deliveriesRepository.updateDelivery(
          tenantId,
          id,
          updates,
          replacements,
          transaction,
        );
      }

      if (dto.lines) {
        await this.deliveryLinesRepository.deleteByDeliveryId(tenantId, id, transaction);
        for (const line of dto.lines) {
          await this.deliveryLinesRepository.insertLine(
            tenantId,
            {
              branchId: existing.branchId,
              deliveryId: id,
              productId: line.productId,
              saleOrderLineId: line.saleOrderLineId ?? null,
              productVariantId: line.productVariantId ?? null,
              qtyDemand: line.qtyDemand,
              qtyDone: line.qtyDone ?? 0,
              unitOfMeasureId: line.unitOfMeasureId ?? null,
              locationId: line.locationId ?? null,
              lotNumber: line.lotNumber ?? null,
              serialNumber: line.serialNumber ?? null,
              createdBy: auditContext.userId ?? null,
            },
            transaction,
          );
        }
      }

      await transaction.commit();

      await this.auditService.logUpdate(
        tenantId,
        ENTITY_TABLE,
        id,
        existing as Record<string, unknown>,
        dto as unknown as Record<string, unknown>,
        auditContext.userId,
      );

      return this.findById(tenantId, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async validate(tenantId: string, id: string, auditContext: AuditContext) {
    const delivery = await this.deliveriesRepository.findOneById(tenantId, id);
    if (!delivery) {
      throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, ENTITY_NAME, id));
    }

    this.statusTransitionService.validateOrThrow('delivery', delivery.status, DeliveryStatus.DONE);

    const lines = await this.deliveryLinesRepository.findByDeliveryId(tenantId, id);
    if (!lines || lines.length === 0) {
      throw new BadRequestException(`${ENTITY_NAME} ${id} has no lines to validate`);
    }

    // Resolve default warehouse for branch
    const defaultWarehouse = await this.warehousesRepository.findDefault(tenantId);
    const warehouseId = defaultWarehouse?.id as string;
    if (!warehouseId) {
      throw new BadRequestException(msg(ErrorMessages.NO_DEFAULT_WAREHOUSE));
    }

    const transaction = await this.deliveriesRepository.getTransaction();

    try {
      // Create stock movements for each line
      for (const line of lines) {
        const qtyDone = parseFloat(line.qtyDone || line.qtyDemand);
        if (qtyDone <= 0) continue;

        await this.inventoryService.createMovement(
          tenantId,
          {
            productId: line.productId,
            warehouseId,
            movementType: StockMovementType.SALE_DELIVERY,
            quantity: -qtyDone,
            notes: `Delivery ${delivery.reference ?? id}`,
            referenceId: id,
            referenceType: StockReferenceType.SALES_ORDER,
            branchId: delivery.branchId ?? undefined,
            lotNumber: line.lotNumber ?? undefined,
            serialNumber: line.serialNumber ?? undefined,
          } as any,
          transaction,
        );
      }

      // Update delivery status to DONE
      await this.deliveriesRepository.updateDelivery(
        tenantId,
        id,
        [
          'status = :status',
          '"doneDate" = NOW()',
          '"updatedBy" = :updatedBy',
          '"updatedAt" = NOW()',
          'version = version + 1',
        ],
        {
          status: DeliveryStatus.DONE,
          updatedBy: auditContext.userId ?? null,
        },
        transaction,
      );

      await this.outboxService.createEvent({
        tenantId,
        eventType: 'delivery.validated',
        payload: {
          deliveryId: id,
          reference: delivery.reference,
          partnerId: delivery.partnerId,
          lineCount: lines.length,
        },
        transaction,
      });

      await transaction.commit();

      await this.auditService.logStatusChange(
        tenantId,
        ENTITY_TABLE,
        id,
        delivery.status,
        DeliveryStatus.DONE,
        auditContext.userId,
      );

      return this.findById(tenantId, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async cancel(tenantId: string, id: string, auditContext: AuditContext) {
    const delivery = await this.deliveriesRepository.findOneById(tenantId, id);
    if (!delivery) {
      throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, ENTITY_NAME, id));
    }

    this.statusTransitionService.validateOrThrow(
      'delivery',
      delivery.status,
      DeliveryStatus.CANCELLED,
    );

    await this.deliveriesRepository.updateDelivery(
      tenantId,
      id,
      [
        'status = :status',
        '"updatedBy" = :updatedBy',
        '"updatedAt" = NOW()',
        'version = version + 1',
      ],
      {
        status: DeliveryStatus.CANCELLED,
        updatedBy: auditContext.userId ?? null,
      },
    );

    await this.auditService.logStatusChange(
      tenantId,
      ENTITY_TABLE,
      id,
      delivery.status,
      DeliveryStatus.CANCELLED,
      auditContext.userId,
    );

    return this.findById(tenantId, id);
  }
}
