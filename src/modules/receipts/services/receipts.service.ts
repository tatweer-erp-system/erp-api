import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ReceiptsRepository } from '@/database/sql/repositories/receipts.repository';
import { ReceiptLinesRepository } from '@/database/sql/repositories/receipt-lines.repository';
import { InventorySharedService } from '@/shared/services/inventory-shared.service';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { WarehousesRepository } from '@/database/sql/repositories/warehouses.repository';
import { PurchaseOrderLinesRepository } from '@/database/sql/repositories/purchase-order-lines.repository';
import { PurchaseOrdersRepository } from '@/database/sql/repositories/purchase-orders.repository';
import { CreateReceiptDto } from '../dto/create-receipt.dto';
import { UpdateReceiptDto } from '../dto/update-receipt.dto';
import { ReceiptQueryDto } from '../dto/receipt-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ReceiptStatus } from '@/common/enums/inventory-new.enums';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

const ENTITY_NAME = 'Receipt';
const ENTITY_TABLE = 'receipts';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly receiptsRepository: ReceiptsRepository,
    private readonly receiptLinesRepository: ReceiptLinesRepository,
    private readonly inventoryService: InventorySharedService,
    private readonly auditService: AuditSharedService,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly outboxService: OutboxSharedService,
    private readonly sequencesService: SequencesService,
    private readonly warehousesRepository: WarehousesRepository,
    private readonly purchaseOrderLinesRepository: PurchaseOrderLinesRepository,
    private readonly purchaseOrdersRepository: PurchaseOrdersRepository,
  ) {
    this.statusTransitionService.registerTransitions('receipt', [
      { from: ReceiptStatus.DRAFT, to: ReceiptStatus.READY },
      { from: ReceiptStatus.READY, to: ReceiptStatus.DONE },
      { from: [ReceiptStatus.DRAFT, ReceiptStatus.READY], to: ReceiptStatus.CANCELLED },
    ]);
  }

  async findAll(tenantId: string, query: ReceiptQueryDto) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.receiptsRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search: query.search,
      sortOrder: query.sortOrder || 'DESC',
      status: query.status,
      purchaseOrderId: query.purchaseOrderId,
      partnerId: query.partnerId,
      branchId: query.branchId,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const receipt = await this.receiptsRepository.findOneWithLines(tenantId, id);
    if (!receipt) {
      throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, ENTITY_NAME, id));
    }
    return receipt;
  }

  async create(tenantId: string, dto: CreateReceiptDto, auditContext: AuditContext) {
    const transaction = await this.receiptsRepository.getTransaction();

    try {
      const reference = await this.sequencesService.nextNumber(tenantId, 'receipt', dto.branchId);

      const receiptId = await this.receiptsRepository.insertReceipt(
        tenantId,
        {
          branchId: dto.branchId,
          reference,
          purchaseOrderId: dto.purchaseOrderId ?? null,
          partnerId: dto.partnerId,
          status: ReceiptStatus.DRAFT,
          scheduledDate: dto.scheduledDate ?? null,
          responsibleId: dto.responsibleId ?? null,
          notes: dto.notes ?? null,
          createdBy: auditContext.userId ?? null,
        },
        transaction,
      );

      for (const line of dto.lines) {
        await this.receiptLinesRepository.insertLine(
          tenantId,
          {
            branchId: dto.branchId,
            receiptId,
            productId: line.productId,
            purchaseOrderLineId: line.purchaseOrderLineId ?? null,
            productVariantId: line.productVariantId ?? null,
            qtyDemand: line.qtyDemand,
            qtyDone: line.qtyDone ?? 0,
            unitOfMeasureId: line.unitOfMeasureId ?? null,
            locationId: line.locationId ?? null,
            lotNumber: line.lotNumber ?? null,
            serialNumber: line.serialNumber ?? null,
            expiryDate: line.expiryDate ?? null,
            unitCost: line.unitCost ?? 0,
            createdBy: auditContext.userId ?? null,
          },
          transaction,
        );
      }

      await transaction.commit();

      await this.auditService.logCreate(
        tenantId,
        ENTITY_TABLE,
        receiptId,
        dto as unknown as Record<string, unknown>,
        auditContext.userId,
      );

      return this.findById(tenantId, receiptId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateReceiptDto, auditContext: AuditContext) {
    const existing = await this.receiptsRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, ENTITY_NAME, id));
    }

    if (existing.status !== ReceiptStatus.DRAFT) {
      throw new BadRequestException(
        `${ENTITY_NAME} can only be updated in draft status — current status is "${existing.status}"`,
      );
    }

    if (existing.version !== dto.version) {
      throw new ConflictException(
        msg(ErrorMessages.VERSION_CONFLICT, dto.version, existing.version),
      );
    }

    const transaction = await this.receiptsRepository.getTransaction();

    try {
      const updates: string[] = [];
      const replacements: Record<string, unknown> = {};

      if (dto.purchaseOrderId !== undefined) {
        updates.push('"purchaseOrderId" = :purchaseOrderId');
        replacements.purchaseOrderId = dto.purchaseOrderId;
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

        await this.receiptsRepository.updateReceipt(
          tenantId,
          id,
          updates,
          replacements,
          transaction,
        );
      }

      if (dto.lines) {
        await this.receiptLinesRepository.deleteByReceiptId(tenantId, id, transaction);
        for (const line of dto.lines) {
          await this.receiptLinesRepository.insertLine(
            tenantId,
            {
              branchId: existing.branchId,
              receiptId: id,
              productId: line.productId,
              purchaseOrderLineId: line.purchaseOrderLineId ?? null,
              productVariantId: line.productVariantId ?? null,
              qtyDemand: line.qtyDemand,
              qtyDone: line.qtyDone ?? 0,
              unitOfMeasureId: line.unitOfMeasureId ?? null,
              locationId: line.locationId ?? null,
              lotNumber: line.lotNumber ?? null,
              serialNumber: line.serialNumber ?? null,
              expiryDate: line.expiryDate ?? null,
              unitCost: line.unitCost ?? 0,
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
    const receipt = await this.receiptsRepository.findOneById(tenantId, id);
    if (!receipt) {
      throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, ENTITY_NAME, id));
    }

    this.statusTransitionService.validateOrThrow('receipt', receipt.status, ReceiptStatus.DONE);

    const lines = await this.receiptLinesRepository.findByReceiptId(tenantId, id);
    if (!lines || lines.length === 0) {
      throw new BadRequestException(`${ENTITY_NAME} ${id} has no lines to validate`);
    }

    // Resolve default warehouse for branch
    const defaultWarehouse = await this.warehousesRepository.findDefault(tenantId);
    const warehouseId = defaultWarehouse?.id as string;
    if (!warehouseId) {
      throw new BadRequestException('No default warehouse configured for this tenant');
    }

    // ── BUG-005 fix: Validate qtyDone does not exceed qtyDemand ──────────
    for (const line of lines) {
      const qtyDone = parseFloat(line.qtyDone || line.qtyDemand);
      const qtyDemand = parseFloat(line.qtyDemand);
      if (qtyDone > qtyDemand) {
        throw new BadRequestException(
          msg(ErrorMessages.RECEIPT_QTY_EXCEEDS_DEMAND, qtyDone, qtyDemand, line.productId),
        );
      }
    }

    const transaction = await this.receiptsRepository.getTransaction();

    try {
      // Create stock movements for each line — inbound
      for (const line of lines) {
        const qtyDone = parseFloat(line.qtyDone || line.qtyDemand);
        if (qtyDone <= 0) continue;

        await this.inventoryService.createMovement(
          tenantId,
          {
            productId: line.productId,
            warehouseId,
            movementType: StockMovementType.PURCHASE_RECEIPT,
            quantity: qtyDone,
            unitCost: parseFloat(line.unitCost ?? '0'),
            notes: `Receipt ${receipt.reference ?? id}`,
            referenceId: id,
            referenceType: StockReferenceType.PURCHASE_ORDER,
            branchId: receipt.branchId ?? undefined,
            lotNumber: line.lotNumber ?? undefined,
            serialNumber: line.serialNumber ?? undefined,
            expiryDate: line.expiryDate ?? undefined,
          } as any,
          transaction,
        );
      }

      // Update receipt status to DONE
      await this.receiptsRepository.updateReceipt(
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
          status: ReceiptStatus.DONE,
          updatedBy: auditContext.userId ?? null,
        },
        transaction,
      );

      // ── BUG-007 fix: Update PO line receivedQuantity and PO receiptStatus ──
      if (receipt.purchaseOrderId) {
        for (const line of lines) {
          if (line.purchaseOrderLineId) {
            const qtyDone = parseFloat(line.qtyDone || line.qtyDemand);
            if (qtyDone <= 0) continue;

            const poLine = await this.purchaseOrderLinesRepository.findOneByIdTenant(
              tenantId,
              line.purchaseOrderLineId,
            );
            if (poLine) {
              const newReceived = parseFloat(poLine.receivedQuantity ?? 0) + qtyDone;
              await this.purchaseOrderLinesRepository.updateReceivedQuantity(
                tenantId,
                line.purchaseOrderLineId,
                newReceived,
              );
            }
          }
        }

        // Update PO receiptStatus based on whether all lines are fully received
        const poLines = await this.purchaseOrderLinesRepository.findByOrderIdTenant(
          tenantId,
          receipt.purchaseOrderId,
        );
        const allReceived = poLines.every(
          (pl: any) => parseFloat(pl.receivedQuantity ?? 0) >= parseFloat(pl.quantity),
        );
        const receiptStatus = allReceived ? 'received' : 'partial';
        await this.purchaseOrdersRepository.updateOrder(
          tenantId,
          receipt.purchaseOrderId,
          ['"receiptStatus" = :receiptStatus', '"updatedAt" = NOW()'],
          { id: receipt.purchaseOrderId, receiptStatus },
        );
      }

      await this.outboxService.createEvent({
        tenantId,
        eventType: 'receipt.validated',
        payload: {
          receiptId: id,
          reference: receipt.reference,
          partnerId: receipt.partnerId,
          purchaseOrderId: receipt.purchaseOrderId,
          lineCount: lines.length,
        },
        transaction,
      });

      await transaction.commit();

      await this.auditService.logStatusChange(
        tenantId,
        ENTITY_TABLE,
        id,
        receipt.status,
        ReceiptStatus.DONE,
        auditContext.userId,
      );

      return this.findById(tenantId, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async cancel(tenantId: string, id: string, auditContext: AuditContext) {
    const receipt = await this.receiptsRepository.findOneById(tenantId, id);
    if (!receipt) {
      throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, ENTITY_NAME, id));
    }

    this.statusTransitionService.validateOrThrow(
      'receipt',
      receipt.status,
      ReceiptStatus.CANCELLED,
    );

    await this.receiptsRepository.updateReceipt(
      tenantId,
      id,
      [
        'status = :status',
        '"updatedBy" = :updatedBy',
        '"updatedAt" = NOW()',
        'version = version + 1',
      ],
      {
        status: ReceiptStatus.CANCELLED,
        updatedBy: auditContext.userId ?? null,
      },
    );

    await this.auditService.logStatusChange(
      tenantId,
      ENTITY_TABLE,
      id,
      receipt.status,
      ReceiptStatus.CANCELLED,
      auditContext.userId,
    );

    return this.findById(tenantId, id);
  }
}
