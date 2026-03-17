// Mock uuid before any imports that depend on it (BaseEntity uses uuid)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

// Mock repository modules to avoid entity import issues
jest.mock('@/database/sql/repositories/partners.repository', () => ({
  PartnersRepository: jest.fn(),
}));

// Mock CLS for msg() helper
jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { PartnersRepository } from '@/database/sql/repositories/partners.repository';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { PartnerType } from '@/common/enums/partner.enums';

describe('PartnersService', () => {
  let service: PartnersService;

  const mockPartnersRepo = {
    findAllPaginated: jest.fn(),
    findOneWithContacts: jest.fn(),
    findOneById: jest.fn(),
    existsByEmailTenant: jest.fn(),
    insertPartner: jest.fn(),
    updatePartner: jest.fn(),
    softDeletePartner: jest.fn(),
    findDropdown: jest.fn(),
  };

  const mockAuditService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
    logStatusChange: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnersService,
        { provide: PartnersRepository, useValue: mockPartnersRepo },
        { provide: AuditSharedService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PartnersService>(PartnersService);
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated results with default limit and page', async () => {
      mockPartnersRepo.findAllPaginated.mockResolvedValue({
        rows: [{ id: '1', nameEn: 'Partner A' }],
        total: 1,
      });

      const result = await service.findAll(tenantId, {} as any);

      expect(mockPartnersRepo.findAllPaginated).toHaveBeenCalledWith(tenantId, {
        limit: 20,
        offset: 0,
        search: undefined,
        sortOrder: 'ASC',
        type: undefined,
        isCustomer: undefined,
        isSupplier: undefined,
        isActive: undefined,
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('should use custom pagination params', async () => {
      mockPartnersRepo.findAllPaginated.mockResolvedValue({ rows: [], total: 50 });

      const result = await service.findAll(tenantId, { page: 3, limit: 10 } as any);

      expect(mockPartnersRepo.findAllPaginated).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ limit: 10, offset: 20 }),
      );
      expect(result.meta).toEqual({ page: 3, limit: 10, total: 50, totalPages: 5 });
    });

    it('should pass filter params (type, isCustomer, isSupplier, isActive)', async () => {
      mockPartnersRepo.findAllPaginated.mockResolvedValue({ rows: [], total: 0 });

      await service.findAll(tenantId, {
        type: PartnerType.CUSTOMER,
        isCustomer: true,
        isSupplier: false,
        isActive: true,
      } as any);

      expect(mockPartnersRepo.findAllPaginated).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          type: PartnerType.CUSTOMER,
          isCustomer: true,
          isSupplier: false,
          isActive: true,
        }),
      );
    });

    it('should pass search parameter', async () => {
      mockPartnersRepo.findAllPaginated.mockResolvedValue({ rows: [], total: 0 });

      await service.findAll(tenantId, { search: 'acme' } as any);

      expect(mockPartnersRepo.findAllPaginated).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ search: 'acme' }),
      );
    });

    it('should calculate totalPages correctly when total is not divisible by limit', async () => {
      mockPartnersRepo.findAllPaginated.mockResolvedValue({ rows: [], total: 21 });

      const result = await service.findAll(tenantId, { limit: 10 } as any);

      expect(result.meta.totalPages).toBe(3);
    });

    it('should return totalPages 0 when total is 0', async () => {
      mockPartnersRepo.findAllPaginated.mockResolvedValue({ rows: [], total: 0 });

      const result = await service.findAll(tenantId, {} as any);

      expect(result.meta.totalPages).toBe(0);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return partner when found', async () => {
      const partner = { id: 'p-1', nameEn: 'Test Partner' };
      mockPartnersRepo.findOneWithContacts.mockResolvedValue(partner);

      const result = await service.findOne(tenantId, 'p-1');

      expect(result).toEqual(partner);
      expect(mockPartnersRepo.findOneWithContacts).toHaveBeenCalledWith(tenantId, 'p-1');
    });

    it('should throw NotFoundException when partner does not exist', async () => {
      mockPartnersRepo.findOneWithContacts.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      nameEn: 'Acme Corp',
      nameAr: 'شركة اكمي',
      type: PartnerType.CUSTOMER,
    };

    beforeEach(() => {
      mockPartnersRepo.existsByEmailTenant.mockResolvedValue(false);
      mockPartnersRepo.insertPartner.mockResolvedValue('new-partner-id');
      mockPartnersRepo.findOneById.mockResolvedValue({
        id: 'new-partner-id',
        ...baseDto,
        isCustomer: true,
        isSupplier: false,
      });
    });

    it('should auto-set isCustomer=true, isSupplier=false when type=customer', async () => {
      await service.create(tenantId, { ...baseDto, type: PartnerType.CUSTOMER }, auditContext);

      expect(mockPartnersRepo.insertPartner).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ isCustomer: true, isSupplier: false }),
      );
    });

    it('should auto-set isCustomer=false, isSupplier=true when type=supplier', async () => {
      await service.create(tenantId, { ...baseDto, type: PartnerType.SUPPLIER }, auditContext);

      expect(mockPartnersRepo.insertPartner).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ isCustomer: false, isSupplier: true }),
      );
    });

    it('should auto-set both flags true when type=both', async () => {
      await service.create(tenantId, { ...baseDto, type: PartnerType.BOTH }, auditContext);

      expect(mockPartnersRepo.insertPartner).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ isCustomer: true, isSupplier: true }),
      );
    });

    it('should auto-set isCustomer=true, isSupplier=false when type=individual', async () => {
      await service.create(tenantId, { ...baseDto, type: PartnerType.INDIVIDUAL }, auditContext);

      expect(mockPartnersRepo.insertPartner).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ isCustomer: true, isSupplier: false }),
      );
    });

    it('should default country to Saudi Arabia', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockPartnersRepo.insertPartner).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ country: 'Saudi Arabia' }),
      );
    });

    it('should default creditLimit to 0', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockPartnersRepo.insertPartner).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ creditLimit: 0 }),
      );
    });

    it('should set optional fields to null when not provided', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockPartnersRepo.insertPartner).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          taxNumber: null,
          vatNumber: null,
          phone: null,
          mobile: null,
          email: null,
          website: null,
          street: null,
          city: null,
          state: null,
          zip: null,
          paymentTermId: null,
          pricelistId: null,
          arAccountId: null,
          apAccountId: null,
          fiscalPositionId: null,
          bankIban: null,
          bankName: null,
          notes: null,
        }),
      );
    });

    it('should call audit service logCreate after creation', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockAuditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'partners.partners',
        'new-partner-id',
        expect.any(Object),
        auditContext.userId,
      );
    });

    it('should return the created partner', async () => {
      const result = await service.create(tenantId, baseDto, auditContext);

      expect(result).toEqual(expect.objectContaining({ id: 'new-partner-id' }));
    });

    it('should check email uniqueness when email is provided', async () => {
      await service.create(tenantId, { ...baseDto, email: 'test@acme.com' }, auditContext);

      expect(mockPartnersRepo.existsByEmailTenant).toHaveBeenCalledWith(tenantId, 'test@acme.com');
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPartnersRepo.existsByEmailTenant.mockResolvedValue(true);

      await expect(
        service.create(tenantId, { ...baseDto, email: 'dup@acme.com' }, auditContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should not check email uniqueness when email is not provided', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockPartnersRepo.existsByEmailTenant).not.toHaveBeenCalled();
    });

    it('should set createdBy from auditContext', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockPartnersRepo.insertPartner).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ createdBy: 'user-001' }),
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const existingPartner = {
      id: 'p-1',
      nameEn: 'Old Name',
      nameAr: 'اسم قديم',
      type: PartnerType.CUSTOMER,
      email: 'old@test.com',
    };

    beforeEach(() => {
      mockPartnersRepo.findOneById.mockResolvedValue(existingPartner);
    });

    it('should throw NotFoundException when partner does not exist', async () => {
      mockPartnersRepo.findOneById.mockResolvedValueOnce(null);

      await expect(
        service.update(tenantId, 'missing', { nameEn: 'New', version: 0 } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update nameEn field', async () => {
      await service.update(
        tenantId,
        'p-1',
        { nameEn: 'New Name', version: 0 } as any,
        auditContext,
      );

      expect(mockPartnersRepo.updatePartner).toHaveBeenCalledWith(
        tenantId,
        'p-1',
        expect.arrayContaining(['"nameEn" = :nameEn']),
        expect.objectContaining({ nameEn: 'New Name' }),
      );
    });

    it('should update type and recalculate isCustomer/isSupplier flags', async () => {
      await service.update(
        tenantId,
        'p-1',
        { type: PartnerType.SUPPLIER, version: 0 } as any,
        auditContext,
      );

      expect(mockPartnersRepo.updatePartner).toHaveBeenCalledWith(
        tenantId,
        'p-1',
        expect.arrayContaining([
          'type = :type',
          '"isCustomer" = :isCustomer',
          '"isSupplier" = :isSupplier',
        ]),
        expect.objectContaining({
          type: PartnerType.SUPPLIER,
          isCustomer: false,
          isSupplier: true,
        }),
      );
    });

    it('should check email uniqueness when email changes', async () => {
      mockPartnersRepo.existsByEmailTenant.mockResolvedValue(false);

      await service.update(
        tenantId,
        'p-1',
        { email: 'new@test.com', version: 0 } as any,
        auditContext,
      );

      expect(mockPartnersRepo.existsByEmailTenant).toHaveBeenCalledWith(
        tenantId,
        'new@test.com',
        'p-1',
      );
    });

    it('should throw ConflictException when new email already exists', async () => {
      mockPartnersRepo.existsByEmailTenant.mockResolvedValue(true);

      await expect(
        service.update(tenantId, 'p-1', { email: 'dup@test.com', version: 0 } as any, auditContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should not check email if same as existing', async () => {
      await service.update(
        tenantId,
        'p-1',
        { email: 'old@test.com', version: 0 } as any,
        auditContext,
      );

      expect(mockPartnersRepo.existsByEmailTenant).not.toHaveBeenCalled();
    });

    it('should always add updatedBy and updatedAt', async () => {
      await service.update(tenantId, 'p-1', { nameEn: 'X', version: 0 } as any, auditContext);

      expect(mockPartnersRepo.updatePartner).toHaveBeenCalledWith(
        tenantId,
        'p-1',
        expect.arrayContaining(['"updatedBy" = :updatedBy', '"updatedAt" = NOW()']),
        expect.objectContaining({ updatedBy: 'user-001' }),
      );
    });

    it('should call audit service logUpdate', async () => {
      await service.update(tenantId, 'p-1', { nameEn: 'New', version: 0 } as any, auditContext);

      expect(mockAuditService.logUpdate).toHaveBeenCalledWith(
        tenantId,
        'partners.partners',
        'p-1',
        expect.any(Object),
        expect.any(Object),
        auditContext.userId,
      );
    });

    it('should return updated partner', async () => {
      const updated = { ...existingPartner, nameEn: 'New' };
      // First call returns existing, second call returns updated
      mockPartnersRepo.findOneById
        .mockResolvedValueOnce(existingPartner)
        .mockResolvedValueOnce(updated);

      const result = await service.update(
        tenantId,
        'p-1',
        { nameEn: 'New', version: 0 } as any,
        auditContext,
      );

      expect(result).toEqual(updated);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete the partner', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue({ id: 'p-1' });

      await service.remove(tenantId, 'p-1', auditContext);

      expect(mockPartnersRepo.softDeletePartner).toHaveBeenCalledWith(tenantId, 'p-1', 'user-001');
    });

    it('should call audit service logDelete', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue({ id: 'p-1' });

      await service.remove(tenantId, 'p-1', auditContext);

      expect(mockAuditService.logDelete).toHaveBeenCalledWith(
        tenantId,
        'partners.partners',
        'p-1',
        expect.any(Object),
        auditContext.userId,
      );
    });

    it('should throw NotFoundException when partner does not exist', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findByType ─────────────────────────────────────────────────────────────

  describe('findByType', () => {
    it('should filter by specified type', async () => {
      mockPartnersRepo.findAllPaginated.mockResolvedValue({ rows: [], total: 0 });

      await service.findByType(tenantId, PartnerType.SUPPLIER, {} as any);

      expect(mockPartnersRepo.findAllPaginated).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ type: PartnerType.SUPPLIER }),
      );
    });

    it('should use default pagination when not provided', async () => {
      mockPartnersRepo.findAllPaginated.mockResolvedValue({ rows: [], total: 0 });

      await service.findByType(tenantId, PartnerType.CUSTOMER, {} as any);

      expect(mockPartnersRepo.findAllPaginated).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ limit: 20, offset: 0 }),
      );
    });

    it('should return correct meta for paginated results', async () => {
      mockPartnersRepo.findAllPaginated.mockResolvedValue({ rows: [], total: 45 });

      const result = await service.findByType(tenantId, PartnerType.BOTH, {
        limit: 10,
        page: 2,
      } as any);

      expect(result.meta).toEqual({ page: 2, limit: 10, total: 45, totalPages: 5 });
    });
  });

  // ── getDropdown ────────────────────────────────────────────────────────────

  describe('getDropdown', () => {
    it('should call findDropdown with correct params', async () => {
      mockPartnersRepo.findDropdown.mockResolvedValue([]);

      await service.getDropdown(tenantId, { search: 'acme', type: 'customer' });

      expect(mockPartnersRepo.findDropdown).toHaveBeenCalledWith(tenantId, {
        search: 'acme',
        limit: 100,
        type: 'customer',
      });
    });

    it('should default limit to 100', async () => {
      mockPartnersRepo.findDropdown.mockResolvedValue([]);

      await service.getDropdown(tenantId, {});

      expect(mockPartnersRepo.findDropdown).toHaveBeenCalledWith(tenantId, {
        search: undefined,
        limit: 100,
        type: undefined,
      });
    });
  });
});
