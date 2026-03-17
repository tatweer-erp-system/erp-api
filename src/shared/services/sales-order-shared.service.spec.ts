import { SalesOrderSharedService } from './sales-order-shared.service';
import { SequenceEntity } from '@/common/enums/sequence.enums';

jest.mock('uuid', () => ({
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

describe('SalesOrderSharedService', () => {
  let service: SalesOrderSharedService;
  let salesOrdersRepository: Record<string, jest.Mock>;
  let sequencesService: Record<string, jest.Mock>;

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };
  const mockTransaction = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  } as any;

  beforeEach(() => {
    salesOrdersRepository = {
      getSequelizeInstance: jest.fn().mockResolvedValue({
        transaction: jest.fn().mockResolvedValue(mockTransaction),
      }),
      insertOrder: jest.fn().mockResolvedValue(undefined),
    };

    sequencesService = {
      nextNumber: jest.fn().mockResolvedValue('SO-00001'),
    };

    service = new SalesOrderSharedService(salesOrdersRepository as any, sequencesService as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createFromLead()', () => {
    const baseDto = {
      partnerId: 'partner-001',
      currencyId: 'curr-001',
      branchId: 'branch-001',
    };

    it('should create a draft sales order and return id + orderNumber', async () => {
      const result = await service.createFromLead(tenantId, baseDto, auditContext as any);

      expect(result.id).toBe('mock-uuid-v7');
      expect(result.orderNumber).toBe('SO-00001');
      expect(salesOrdersRepository.insertOrder).toHaveBeenCalledTimes(1);
    });

    it('should use partnerId for the order', async () => {
      await service.createFromLead(tenantId, baseDto, auditContext as any);

      expect(salesOrdersRepository.insertOrder).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ partnerId: 'partner-001' }),
        mockTransaction,
      );
    });

    it('should fall back to contactId when partnerId is null', async () => {
      const dto = { ...baseDto, partnerId: null, contactId: 'contact-001' };

      await service.createFromLead(tenantId, dto, auditContext as any);

      expect(salesOrdersRepository.insertOrder).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ partnerId: 'contact-001' }),
        mockTransaction,
      );
    });

    it('should resolve partnerId to null when both are missing', async () => {
      const dto = { ...baseDto, partnerId: null };

      await service.createFromLead(tenantId, dto, auditContext as any);

      expect(salesOrdersRepository.insertOrder).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ partnerId: null }),
        mockTransaction,
      );
    });

    it('should pass pricelistId and fiscalPositionId when provided', async () => {
      const dto = {
        ...baseDto,
        pricelistId: 'pl-001',
        fiscalPositionId: 'fp-001',
      };

      await service.createFromLead(tenantId, dto, auditContext as any);

      expect(salesOrdersRepository.insertOrder).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          pricelistId: 'pl-001',
          fiscalPositionId: 'fp-001',
        }),
        mockTransaction,
      );
    });

    it('should default pricelistId and fiscalPositionId to null', async () => {
      await service.createFromLead(tenantId, baseDto, auditContext as any);

      expect(salesOrdersRepository.insertOrder).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          pricelistId: null,
          fiscalPositionId: null,
        }),
        mockTransaction,
      );
    });

    it('should pass notes when provided', async () => {
      const dto = { ...baseDto, notes: 'From CRM lead' };

      await service.createFromLead(tenantId, dto, auditContext as any);

      expect(salesOrdersRepository.insertOrder).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ notes: 'From CRM lead' }),
        mockTransaction,
      );
    });

    it('should set all monetary fields to 0 for a draft order', async () => {
      await service.createFromLead(tenantId, baseDto, auditContext as any);

      expect(salesOrdersRepository.insertOrder).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          totalAmountBase: 0,
          exchangeRate: 1,
        }),
        mockTransaction,
      );
    });

    it('should generate sequence number with SALES_ORDER entity', async () => {
      await service.createFromLead(tenantId, baseDto, auditContext as any);

      expect(sequencesService.nextNumber).toHaveBeenCalledWith(
        tenantId,
        SequenceEntity.SALES_ORDER,
        'branch-001',
      );
    });

    it('should commit transaction when no containerTransaction provided', async () => {
      await service.createFromLead(tenantId, baseDto, auditContext as any);

      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should NOT commit when containerTransaction is provided', async () => {
      const externalTx = { commit: jest.fn(), rollback: jest.fn() } as any;

      await service.createFromLead(tenantId, baseDto, auditContext as any, externalTx);

      expect(externalTx.commit).not.toHaveBeenCalled();
      expect(salesOrdersRepository.insertOrder).toHaveBeenCalledWith(
        tenantId,
        expect.any(Object),
        externalTx,
      );
    });

    it('should rollback and rethrow on error when owning transaction', async () => {
      salesOrdersRepository.insertOrder.mockRejectedValue(new Error('DB error'));

      await expect(service.createFromLead(tenantId, baseDto, auditContext as any)).rejects.toThrow(
        'DB error',
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should NOT rollback when containerTransaction is provided and error occurs', async () => {
      const externalTx = { commit: jest.fn(), rollback: jest.fn() } as any;
      salesOrdersRepository.insertOrder.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createFromLead(tenantId, baseDto, auditContext as any, externalTx),
      ).rejects.toThrow('DB error');

      expect(externalTx.rollback).not.toHaveBeenCalled();
    });

    it('should set createdBy from auditContext', async () => {
      await service.createFromLead(tenantId, baseDto, auditContext as any);

      expect(salesOrdersRepository.insertOrder).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ createdBy: 'user-001' }),
        mockTransaction,
      );
    });
  });
});
