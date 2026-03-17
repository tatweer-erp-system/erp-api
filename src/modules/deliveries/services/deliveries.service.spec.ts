jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DeliveryStatus } from '@/common/enums/inventory-new.enums';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';

describe('DeliveriesService', () => {
  let service: DeliveriesService;
  let deliveriesRepository: Record<string, jest.Mock>;
  let deliveryLinesRepository: Record<string, jest.Mock>;
  let inventoryService: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;
  let statusTransitionService: Record<string, jest.Mock>;
  let outboxService: Record<string, jest.Mock>;
  let sequencesService: Record<string, jest.Mock>;
  let warehousesRepository: Record<string, jest.Mock>;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001', tenantId };

  beforeEach(() => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    deliveriesRepository = {
      findAllPaginated: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
      findOneById: jest.fn().mockResolvedValue(null),
      findOneWithLines: jest.fn().mockResolvedValue(null),
      insertDelivery: jest.fn().mockResolvedValue('del-001'),
      updateDelivery: jest.fn().mockResolvedValue(undefined),
      getTransaction: jest.fn().mockResolvedValue(mockTransaction),
    };

    deliveryLinesRepository = {
      insertLine: jest.fn().mockResolvedValue('line-001'),
      findByDeliveryId: jest.fn().mockResolvedValue([]),
      deleteByDeliveryId: jest.fn().mockResolvedValue(undefined),
    };

    inventoryService = {
      createMovement: jest.fn().mockResolvedValue({ id: 'mv-001' }),
    };

    auditService = {
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logStatusChange: jest.fn().mockResolvedValue(undefined),
    };

    statusTransitionService = {
      registerTransitions: jest.fn(),
      validateOrThrow: jest.fn(),
    };

    outboxService = {
      createEvent: jest.fn().mockResolvedValue(undefined),
    };

    sequencesService = {
      nextNumber: jest.fn().mockResolvedValue('DEL-00001'),
    };

    warehousesRepository = {
      findDefault: jest.fn().mockResolvedValue({ id: 'wh-default' }),
    };

    service = new DeliveriesService(
      deliveriesRepository as any,
      deliveryLinesRepository as any,
      inventoryService as any,
      auditService as any,
      statusTransitionService as any,
      outboxService as any,
      sequencesService as any,
      warehousesRepository as any,
    );
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const baseDto = {
      branchId: 'branch-001',
      partnerId: 'partner-001',
      lines: [
        { productId: 'p1', qtyDemand: 10 },
        { productId: 'p2', qtyDemand: 5 },
      ],
    };

    beforeEach(() => {
      deliveriesRepository.findOneWithLines.mockResolvedValue({
        id: 'del-001',
        reference: 'DEL-00001',
        status: DeliveryStatus.DRAFT,
        lines: [],
      });
    });

    it('should create delivery with DRAFT status', async () => {
      await service.create(tenantId, baseDto as any, auditContext);

      expect(deliveriesRepository.insertDelivery).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          branchId: 'branch-001',
          partnerId: 'partner-001',
          status: DeliveryStatus.DRAFT,
          reference: 'DEL-00001',
        }),
        mockTransaction,
      );
    });

    it('should create delivery lines for each line in DTO', async () => {
      await service.create(tenantId, baseDto as any, auditContext);

      expect(deliveryLinesRepository.insertLine).toHaveBeenCalledTimes(2);
      expect(deliveryLinesRepository.insertLine).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ deliveryId: 'del-001', productId: 'p1', qtyDemand: 10 }),
        mockTransaction,
      );
    });

    it('should generate sequence reference', async () => {
      await service.create(tenantId, baseDto as any, auditContext);

      expect(sequencesService.nextNumber).toHaveBeenCalledWith(tenantId, 'delivery', 'branch-001');
    });

    it('should commit transaction and log audit', async () => {
      await service.create(tenantId, baseDto as any, auditContext);

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(auditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'deliveries',
        'del-001',
        expect.any(Object),
        'user-001',
      );
    });

    it('should rollback on error', async () => {
      deliveriesRepository.insertDelivery.mockRejectedValue(new Error('DB error'));

      await expect(service.create(tenantId, baseDto as any, auditContext)).rejects.toThrow(
        'DB error',
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should handle optional fields (saleOrderId, scheduledDate, notes)', async () => {
      const dto = {
        ...baseDto,
        saleOrderId: 'so-001',
        scheduledDate: '2026-04-01',
        notes: 'Rush delivery',
        responsibleId: 'user-002',
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(deliveriesRepository.insertDelivery).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          saleOrderId: 'so-001',
          scheduledDate: '2026-04-01',
          notes: 'Rush delivery',
          responsibleId: 'user-002',
        }),
        mockTransaction,
      );
    });

    it('should pass line-level optional fields (productVariantId, lotNumber, etc)', async () => {
      const dto = {
        branchId: 'branch-001',
        partnerId: 'partner-001',
        lines: [
          {
            productId: 'p1',
            qtyDemand: 10,
            qtyDone: 8,
            productVariantId: 'var-1',
            lotNumber: 'LOT-A',
            serialNumber: 'SN-001',
            locationId: 'loc-1',
          },
        ],
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(deliveryLinesRepository.insertLine).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          productVariantId: 'var-1',
          lotNumber: 'LOT-A',
          serialNumber: 'SN-001',
          locationId: 'loc-1',
          qtyDone: 8,
        }),
        mockTransaction,
      );
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return delivery with lines', async () => {
      const delivery = { id: 'del-1', lines: [{ id: 'line-1' }] };
      deliveriesRepository.findOneWithLines.mockResolvedValue(delivery);

      const result = await service.findById(tenantId, 'del-1');

      expect(result).toBe(delivery);
    });

    it('should throw NotFoundException when delivery not found', async () => {
      deliveriesRepository.findOneWithLines.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── validate ──────────────────────────────────────────────────────────────

  describe('validate()', () => {
    const draftDelivery = {
      id: 'del-001',
      status: DeliveryStatus.READY,
      reference: 'DEL-00001',
      branchId: 'branch-001',
      partnerId: 'partner-001',
    };

    const lines = [
      { productId: 'p1', qtyDemand: '10', qtyDone: '10' },
      { productId: 'p2', qtyDemand: '5', qtyDone: '3' },
    ];

    beforeEach(() => {
      deliveriesRepository.findOneById.mockResolvedValue(draftDelivery);
      deliveryLinesRepository.findByDeliveryId.mockResolvedValue(lines);
      deliveriesRepository.findOneWithLines.mockResolvedValue({
        ...draftDelivery,
        status: DeliveryStatus.DONE,
        lines,
      });
    });

    it('should create outbound stock movements for each line', async () => {
      await service.validate(tenantId, 'del-001', auditContext);

      expect(inventoryService.createMovement).toHaveBeenCalledTimes(2);

      // First line: p1, qty=10
      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          productId: 'p1',
          warehouseId: 'wh-default',
          movementType: StockMovementType.SALE_DELIVERY,
          quantity: -10,
          referenceType: StockReferenceType.SALES_ORDER,
        }),
        mockTransaction,
      );

      // Second line: p2, qty=3 (qtyDone)
      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          productId: 'p2',
          quantity: -3,
        }),
        mockTransaction,
      );
    });

    it('should update delivery status to DONE', async () => {
      await service.validate(tenantId, 'del-001', auditContext);

      expect(deliveriesRepository.updateDelivery).toHaveBeenCalledWith(
        tenantId,
        'del-001',
        expect.arrayContaining(['status = :status', '"doneDate" = NOW()']),
        expect.objectContaining({ status: DeliveryStatus.DONE }),
        mockTransaction,
      );
    });

    it('should emit delivery.validated outbox event', async () => {
      await service.validate(tenantId, 'del-001', auditContext);

      expect(outboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'delivery.validated',
          payload: expect.objectContaining({
            deliveryId: 'del-001',
            lineCount: 2,
          }),
        }),
      );
    });

    it('should log status change audit', async () => {
      await service.validate(tenantId, 'del-001', auditContext);

      expect(auditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'deliveries',
        'del-001',
        DeliveryStatus.READY,
        DeliveryStatus.DONE,
        'user-001',
      );
    });

    it('should throw NotFoundException when delivery not found', async () => {
      deliveriesRepository.findOneById.mockResolvedValue(null);

      await expect(service.validate(tenantId, 'bad', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call statusTransitionService.validateOrThrow', async () => {
      await service.validate(tenantId, 'del-001', auditContext);

      expect(statusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'delivery',
        DeliveryStatus.READY,
        DeliveryStatus.DONE,
      );
    });

    it('should throw when transition is invalid (e.g. DONE -> DONE)', async () => {
      deliveriesRepository.findOneById.mockResolvedValue({
        ...draftDelivery,
        status: DeliveryStatus.DONE,
      });
      statusTransitionService.validateOrThrow.mockImplementation(() => {
        throw new BadRequestException('Transition not allowed');
      });

      await expect(service.validate(tenantId, 'del-001', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when delivery has no lines', async () => {
      deliveryLinesRepository.findByDeliveryId.mockResolvedValue([]);

      await expect(service.validate(tenantId, 'del-001', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when no default warehouse is configured', async () => {
      warehousesRepository.findDefault.mockResolvedValue(null);

      await expect(service.validate(tenantId, 'del-001', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should skip lines with qtyDone <= 0', async () => {
      deliveryLinesRepository.findByDeliveryId.mockResolvedValue([
        { productId: 'p1', qtyDemand: '10', qtyDone: '0' },
        { productId: 'p2', qtyDemand: '5', qtyDone: '5' },
      ]);

      await service.validate(tenantId, 'del-001', auditContext);

      expect(inventoryService.createMovement).toHaveBeenCalledTimes(1);
      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ productId: 'p2' }),
        mockTransaction,
      );
    });

    it('should use qtyDemand as fallback when qtyDone is falsy', async () => {
      deliveryLinesRepository.findByDeliveryId.mockResolvedValue([
        { productId: 'p1', qtyDemand: '10', qtyDone: null },
      ]);

      await service.validate(tenantId, 'del-001', auditContext);

      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ quantity: -10 }),
        mockTransaction,
      );
    });

    it('should rollback on error during validation', async () => {
      inventoryService.createMovement.mockRejectedValue(new Error('Stock error'));

      await expect(service.validate(tenantId, 'del-001', auditContext)).rejects.toThrow(
        'Stock error',
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('should cancel a DRAFT delivery', async () => {
      deliveriesRepository.findOneById.mockResolvedValue({
        id: 'del-001',
        status: DeliveryStatus.DRAFT,
      });
      deliveriesRepository.findOneWithLines.mockResolvedValue({
        id: 'del-001',
        status: DeliveryStatus.CANCELLED,
      });

      await service.cancel(tenantId, 'del-001', auditContext);

      expect(statusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'delivery',
        DeliveryStatus.DRAFT,
        DeliveryStatus.CANCELLED,
      );
      expect(deliveriesRepository.updateDelivery).toHaveBeenCalledWith(
        tenantId,
        'del-001',
        expect.arrayContaining(['status = :status']),
        expect.objectContaining({ status: DeliveryStatus.CANCELLED }),
      );
    });

    it('should cancel a READY delivery', async () => {
      deliveriesRepository.findOneById.mockResolvedValue({
        id: 'del-001',
        status: DeliveryStatus.READY,
      });
      deliveriesRepository.findOneWithLines.mockResolvedValue({
        id: 'del-001',
        status: DeliveryStatus.CANCELLED,
      });

      await service.cancel(tenantId, 'del-001', auditContext);

      expect(statusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'delivery',
        DeliveryStatus.READY,
        DeliveryStatus.CANCELLED,
      );
    });

    it('should throw when delivery not found', async () => {
      deliveriesRepository.findOneById.mockResolvedValue(null);

      await expect(service.cancel(tenantId, 'bad', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw when trying to cancel DONE delivery', async () => {
      deliveriesRepository.findOneById.mockResolvedValue({
        id: 'del-001',
        status: DeliveryStatus.DONE,
      });
      statusTransitionService.validateOrThrow.mockImplementation(() => {
        throw new BadRequestException('Transition not allowed');
      });

      await expect(service.cancel(tenantId, 'del-001', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log status change audit on cancel', async () => {
      deliveriesRepository.findOneById.mockResolvedValue({
        id: 'del-001',
        status: DeliveryStatus.DRAFT,
      });
      deliveriesRepository.findOneWithLines.mockResolvedValue({
        id: 'del-001',
        status: DeliveryStatus.CANCELLED,
      });

      await service.cancel(tenantId, 'del-001', auditContext);

      expect(auditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'deliveries',
        'del-001',
        DeliveryStatus.DRAFT,
        DeliveryStatus.CANCELLED,
        'user-001',
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should only allow updates in DRAFT status', async () => {
      deliveriesRepository.findOneById.mockResolvedValue({
        id: 'del-001',
        status: DeliveryStatus.DONE,
        version: 1,
      });

      await expect(
        service.update(tenantId, 'del-001', { version: 1 } as any, auditContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on version mismatch', async () => {
      deliveriesRepository.findOneById.mockResolvedValue({
        id: 'del-001',
        status: DeliveryStatus.DRAFT,
        version: 2,
      });

      await expect(
        service.update(tenantId, 'del-001', { version: 1 } as any, auditContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should replace lines when dto.lines is provided', async () => {
      deliveriesRepository.findOneById.mockResolvedValue({
        id: 'del-001',
        status: DeliveryStatus.DRAFT,
        version: 1,
        branchId: 'b1',
      });
      deliveriesRepository.findOneWithLines.mockResolvedValue({ id: 'del-001' });

      const dto = {
        version: 1,
        lines: [{ productId: 'p-new', qtyDemand: 7 }],
      };

      await service.update(tenantId, 'del-001', dto as any, auditContext);

      expect(deliveryLinesRepository.deleteByDeliveryId).toHaveBeenCalledWith(
        tenantId,
        'del-001',
        mockTransaction,
      );
      expect(deliveryLinesRepository.insertLine).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ productId: 'p-new', qtyDemand: 7 }),
        mockTransaction,
      );
    });
  });

  // ── Status transition registration ────────────────────────────────────────

  describe('constructor — status transitions', () => {
    it('should register delivery status transitions', () => {
      expect(statusTransitionService.registerTransitions).toHaveBeenCalledWith(
        'delivery',
        expect.arrayContaining([
          expect.objectContaining({ from: DeliveryStatus.DRAFT, to: DeliveryStatus.READY }),
          expect.objectContaining({ from: DeliveryStatus.READY, to: DeliveryStatus.DONE }),
        ]),
      );
    });
  });
});
