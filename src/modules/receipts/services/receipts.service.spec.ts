jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { ReceiptStatus } from '@/common/enums/inventory-new.enums';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';

describe('ReceiptsService', () => {
  let service: ReceiptsService;
  let receiptsRepository: Record<string, jest.Mock>;
  let receiptLinesRepository: Record<string, jest.Mock>;
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

    receiptsRepository = {
      findAllPaginated: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
      findOneById: jest.fn().mockResolvedValue(null),
      findOneWithLines: jest.fn().mockResolvedValue(null),
      insertReceipt: jest.fn().mockResolvedValue('rec-001'),
      updateReceipt: jest.fn().mockResolvedValue(undefined),
      getTransaction: jest.fn().mockResolvedValue(mockTransaction),
    };

    receiptLinesRepository = {
      insertLine: jest.fn().mockResolvedValue('line-001'),
      findByReceiptId: jest.fn().mockResolvedValue([]),
      deleteByReceiptId: jest.fn().mockResolvedValue(undefined),
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
      nextNumber: jest.fn().mockResolvedValue('REC-00001'),
    };

    warehousesRepository = {
      findDefault: jest.fn().mockResolvedValue({ id: 'wh-default' }),
    };

    service = new ReceiptsService(
      receiptsRepository as any,
      receiptLinesRepository as any,
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
        { productId: 'p1', qtyDemand: 20, unitCost: 10 },
        { productId: 'p2', qtyDemand: 10, unitCost: 15 },
      ],
    };

    beforeEach(() => {
      receiptsRepository.findOneWithLines.mockResolvedValue({
        id: 'rec-001',
        reference: 'REC-00001',
        status: ReceiptStatus.DRAFT,
        lines: [],
      });
    });

    it('should create receipt with DRAFT status', async () => {
      await service.create(tenantId, baseDto as any, auditContext);

      expect(receiptsRepository.insertReceipt).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          branchId: 'branch-001',
          partnerId: 'partner-001',
          status: ReceiptStatus.DRAFT,
          reference: 'REC-00001',
        }),
        mockTransaction,
      );
    });

    it('should create receipt lines with unitCost for each line', async () => {
      await service.create(tenantId, baseDto as any, auditContext);

      expect(receiptLinesRepository.insertLine).toHaveBeenCalledTimes(2);
      expect(receiptLinesRepository.insertLine).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          receiptId: 'rec-001',
          productId: 'p1',
          qtyDemand: 20,
          unitCost: 10,
        }),
        mockTransaction,
      );
    });

    it('should generate sequence reference', async () => {
      await service.create(tenantId, baseDto as any, auditContext);

      expect(sequencesService.nextNumber).toHaveBeenCalledWith(tenantId, 'receipt', 'branch-001');
    });

    it('should commit and log audit', async () => {
      await service.create(tenantId, baseDto as any, auditContext);

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(auditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'receipts',
        'rec-001',
        expect.any(Object),
        'user-001',
      );
    });

    it('should rollback on error', async () => {
      receiptsRepository.insertReceipt.mockRejectedValue(new Error('DB error'));

      await expect(service.create(tenantId, baseDto as any, auditContext)).rejects.toThrow(
        'DB error',
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should handle optional fields (purchaseOrderId, scheduledDate, notes)', async () => {
      const dto = {
        ...baseDto,
        purchaseOrderId: 'po-001',
        scheduledDate: '2026-04-01',
        notes: 'Urgent order',
        responsibleId: 'user-002',
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(receiptsRepository.insertReceipt).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          purchaseOrderId: 'po-001',
          scheduledDate: '2026-04-01',
          notes: 'Urgent order',
          responsibleId: 'user-002',
        }),
        mockTransaction,
      );
    });

    it('should pass line-level optional fields (lotNumber, serialNumber, expiryDate)', async () => {
      const dto = {
        branchId: 'branch-001',
        partnerId: 'partner-001',
        lines: [
          {
            productId: 'p1',
            qtyDemand: 10,
            qtyDone: 8,
            unitCost: 10,
            productVariantId: 'var-1',
            lotNumber: 'LOT-A',
            serialNumber: 'SN-001',
            expiryDate: '2027-01-01',
            locationId: 'loc-1',
          },
        ],
      };

      await service.create(tenantId, dto as any, auditContext);

      expect(receiptLinesRepository.insertLine).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          productVariantId: 'var-1',
          lotNumber: 'LOT-A',
          serialNumber: 'SN-001',
          expiryDate: '2027-01-01',
          locationId: 'loc-1',
          qtyDone: 8,
        }),
        mockTransaction,
      );
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return receipt with lines', async () => {
      const receipt = { id: 'rec-1', lines: [{ id: 'line-1' }] };
      receiptsRepository.findOneWithLines.mockResolvedValue(receipt);

      const result = await service.findById(tenantId, 'rec-1');

      expect(result).toBe(receipt);
    });

    it('should throw NotFoundException when not found', async () => {
      receiptsRepository.findOneWithLines.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ── validate ──────────────────────────────────────────────────────────────

  describe('validate()', () => {
    const readyReceipt = {
      id: 'rec-001',
      status: ReceiptStatus.READY,
      reference: 'REC-00001',
      branchId: 'branch-001',
      partnerId: 'partner-001',
      purchaseOrderId: 'po-001',
    };

    const lines = [
      { productId: 'p1', qtyDemand: '20', qtyDone: '20', unitCost: '10', lotNumber: 'LOT-A' },
      { productId: 'p2', qtyDemand: '10', qtyDone: '8', unitCost: '15' },
    ];

    beforeEach(() => {
      receiptsRepository.findOneById.mockResolvedValue(readyReceipt);
      receiptLinesRepository.findByReceiptId.mockResolvedValue(lines);
      receiptsRepository.findOneWithLines.mockResolvedValue({
        ...readyReceipt,
        status: ReceiptStatus.DONE,
        lines,
      });
    });

    it('should create inbound stock movements for each line (PURCHASE_RECEIPT)', async () => {
      await service.validate(tenantId, 'rec-001', auditContext);

      expect(inventoryService.createMovement).toHaveBeenCalledTimes(2);

      // First line: p1, qty=20, unitCost=10
      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          productId: 'p1',
          warehouseId: 'wh-default',
          movementType: StockMovementType.PURCHASE_RECEIPT,
          quantity: 20,
          unitCost: 10,
          referenceType: StockReferenceType.PURCHASE_ORDER,
          lotNumber: 'LOT-A',
        }),
        mockTransaction,
      );

      // Second line: p2, qty=8 (qtyDone), unitCost=15
      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          productId: 'p2',
          quantity: 8,
          unitCost: 15,
        }),
        mockTransaction,
      );
    });

    it('should update receipt status to DONE', async () => {
      await service.validate(tenantId, 'rec-001', auditContext);

      expect(receiptsRepository.updateReceipt).toHaveBeenCalledWith(
        tenantId,
        'rec-001',
        expect.arrayContaining(['status = :status', '"doneDate" = NOW()']),
        expect.objectContaining({ status: ReceiptStatus.DONE }),
        mockTransaction,
      );
    });

    it('should emit receipt.validated outbox event', async () => {
      await service.validate(tenantId, 'rec-001', auditContext);

      expect(outboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'receipt.validated',
          payload: expect.objectContaining({
            receiptId: 'rec-001',
            purchaseOrderId: 'po-001',
            lineCount: 2,
          }),
        }),
      );
    });

    it('should log status change audit', async () => {
      await service.validate(tenantId, 'rec-001', auditContext);

      expect(auditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'receipts',
        'rec-001',
        ReceiptStatus.READY,
        ReceiptStatus.DONE,
        'user-001',
      );
    });

    it('should throw NotFoundException when receipt not found', async () => {
      receiptsRepository.findOneById.mockResolvedValue(null);

      await expect(service.validate(tenantId, 'bad', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call statusTransitionService.validateOrThrow', async () => {
      await service.validate(tenantId, 'rec-001', auditContext);

      expect(statusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'receipt',
        ReceiptStatus.READY,
        ReceiptStatus.DONE,
      );
    });

    it('should throw when transition is invalid (DONE -> DONE)', async () => {
      receiptsRepository.findOneById.mockResolvedValue({
        ...readyReceipt,
        status: ReceiptStatus.DONE,
      });
      statusTransitionService.validateOrThrow.mockImplementation(() => {
        throw new BadRequestException('Transition not allowed');
      });

      await expect(service.validate(tenantId, 'rec-001', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when receipt has no lines', async () => {
      receiptLinesRepository.findByReceiptId.mockResolvedValue([]);

      await expect(service.validate(tenantId, 'rec-001', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when no default warehouse configured', async () => {
      warehousesRepository.findDefault.mockResolvedValue(null);

      await expect(service.validate(tenantId, 'rec-001', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should skip lines with qtyDone <= 0', async () => {
      receiptLinesRepository.findByReceiptId.mockResolvedValue([
        { productId: 'p1', qtyDemand: '10', qtyDone: '0', unitCost: '10' },
        { productId: 'p2', qtyDemand: '5', qtyDone: '5', unitCost: '15' },
      ]);

      await service.validate(tenantId, 'rec-001', auditContext);

      expect(inventoryService.createMovement).toHaveBeenCalledTimes(1);
      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ productId: 'p2', quantity: 5 }),
        mockTransaction,
      );
    });

    it('should use qtyDemand as fallback when qtyDone is falsy', async () => {
      receiptLinesRepository.findByReceiptId.mockResolvedValue([
        { productId: 'p1', qtyDemand: '10', qtyDone: null, unitCost: '5' },
      ]);

      await service.validate(tenantId, 'rec-001', auditContext);

      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ quantity: 10 }),
        mockTransaction,
      );
    });

    it('should pass unitCost from line to stock movement (for AVCO)', async () => {
      receiptLinesRepository.findByReceiptId.mockResolvedValue([
        { productId: 'p1', qtyDemand: '10', qtyDone: '10', unitCost: '25.50' },
      ]);

      await service.validate(tenantId, 'rec-001', auditContext);

      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ unitCost: 25.5 }),
        mockTransaction,
      );
    });

    it('should pass expiryDate from line to movement when present', async () => {
      receiptLinesRepository.findByReceiptId.mockResolvedValue([
        {
          productId: 'p1',
          qtyDemand: '10',
          qtyDone: '10',
          unitCost: '10',
          expiryDate: '2027-06-01',
          lotNumber: 'LOT-X',
          serialNumber: 'SN-99',
        },
      ]);

      await service.validate(tenantId, 'rec-001', auditContext);

      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          expiryDate: '2027-06-01',
          lotNumber: 'LOT-X',
          serialNumber: 'SN-99',
        }),
        mockTransaction,
      );
    });

    it('should rollback on error during validation', async () => {
      inventoryService.createMovement.mockRejectedValue(new Error('Stock error'));

      await expect(service.validate(tenantId, 'rec-001', auditContext)).rejects.toThrow(
        'Stock error',
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('should cancel a DRAFT receipt', async () => {
      receiptsRepository.findOneById.mockResolvedValue({
        id: 'rec-001',
        status: ReceiptStatus.DRAFT,
      });
      receiptsRepository.findOneWithLines.mockResolvedValue({
        id: 'rec-001',
        status: ReceiptStatus.CANCELLED,
      });

      await service.cancel(tenantId, 'rec-001', auditContext);

      expect(statusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'receipt',
        ReceiptStatus.DRAFT,
        ReceiptStatus.CANCELLED,
      );
      expect(receiptsRepository.updateReceipt).toHaveBeenCalledWith(
        tenantId,
        'rec-001',
        expect.arrayContaining(['status = :status']),
        expect.objectContaining({ status: ReceiptStatus.CANCELLED }),
      );
    });

    it('should cancel a READY receipt', async () => {
      receiptsRepository.findOneById.mockResolvedValue({
        id: 'rec-001',
        status: ReceiptStatus.READY,
      });
      receiptsRepository.findOneWithLines.mockResolvedValue({
        id: 'rec-001',
        status: ReceiptStatus.CANCELLED,
      });

      await service.cancel(tenantId, 'rec-001', auditContext);

      expect(statusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'receipt',
        ReceiptStatus.READY,
        ReceiptStatus.CANCELLED,
      );
    });

    it('should throw when receipt not found', async () => {
      receiptsRepository.findOneById.mockResolvedValue(null);

      await expect(service.cancel(tenantId, 'bad', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw when trying to cancel DONE receipt', async () => {
      receiptsRepository.findOneById.mockResolvedValue({
        id: 'rec-001',
        status: ReceiptStatus.DONE,
      });
      statusTransitionService.validateOrThrow.mockImplementation(() => {
        throw new BadRequestException('Transition not allowed');
      });

      await expect(service.cancel(tenantId, 'rec-001', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log status change audit on cancel', async () => {
      receiptsRepository.findOneById.mockResolvedValue({
        id: 'rec-001',
        status: ReceiptStatus.DRAFT,
      });
      receiptsRepository.findOneWithLines.mockResolvedValue({
        id: 'rec-001',
        status: ReceiptStatus.CANCELLED,
      });

      await service.cancel(tenantId, 'rec-001', auditContext);

      expect(auditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'receipts',
        'rec-001',
        ReceiptStatus.DRAFT,
        ReceiptStatus.CANCELLED,
        'user-001',
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should only allow updates in DRAFT status', async () => {
      receiptsRepository.findOneById.mockResolvedValue({
        id: 'rec-001',
        status: ReceiptStatus.DONE,
        version: 1,
      });

      await expect(
        service.update(tenantId, 'rec-001', { version: 1 } as any, auditContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on version mismatch', async () => {
      receiptsRepository.findOneById.mockResolvedValue({
        id: 'rec-001',
        status: ReceiptStatus.DRAFT,
        version: 2,
      });

      await expect(
        service.update(tenantId, 'rec-001', { version: 1 } as any, auditContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should replace lines when dto.lines is provided', async () => {
      receiptsRepository.findOneById.mockResolvedValue({
        id: 'rec-001',
        status: ReceiptStatus.DRAFT,
        version: 1,
        branchId: 'b1',
      });
      receiptsRepository.findOneWithLines.mockResolvedValue({ id: 'rec-001' });

      const dto = {
        version: 1,
        lines: [{ productId: 'p-new', qtyDemand: 15, unitCost: 12 }],
      };

      await service.update(tenantId, 'rec-001', dto as any, auditContext);

      expect(receiptLinesRepository.deleteByReceiptId).toHaveBeenCalledWith(
        tenantId,
        'rec-001',
        mockTransaction,
      );
      expect(receiptLinesRepository.insertLine).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ productId: 'p-new', qtyDemand: 15, unitCost: 12 }),
        mockTransaction,
      );
    });

    it('should update header fields without replacing lines', async () => {
      receiptsRepository.findOneById.mockResolvedValue({
        id: 'rec-001',
        status: ReceiptStatus.DRAFT,
        version: 1,
        branchId: 'b1',
      });
      receiptsRepository.findOneWithLines.mockResolvedValue({ id: 'rec-001' });

      const dto = {
        version: 1,
        notes: 'Updated note',
      };

      await service.update(tenantId, 'rec-001', dto as any, auditContext);

      expect(receiptLinesRepository.deleteByReceiptId).not.toHaveBeenCalled();
      expect(receiptsRepository.updateReceipt).toHaveBeenCalled();
    });
  });

  // ── Status transition registration ────────────────────────────────────────

  describe('constructor — status transitions', () => {
    it('should register receipt status transitions', () => {
      expect(statusTransitionService.registerTransitions).toHaveBeenCalledWith(
        'receipt',
        expect.arrayContaining([
          expect.objectContaining({ from: ReceiptStatus.DRAFT, to: ReceiptStatus.READY }),
          expect.objectContaining({ from: ReceiptStatus.READY, to: ReceiptStatus.DONE }),
        ]),
      );
    });
  });
});
