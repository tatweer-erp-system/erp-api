jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { VendorsService } from './vendors.service';
import { PartnerType } from '@/common/enums/partner.enums';

describe('VendorsService', () => {
  let service: VendorsService;
  let partnersRepository: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001', tenantId };

  const makeVendor = (overrides: Record<string, unknown> = {}) => ({
    id: 'vendor-001',
    nameEn: 'Supplier Co',
    nameAr: 'شركة المورد',
    type: PartnerType.SUPPLIER,
    isCustomer: false,
    isSupplier: true,
    email: 'supplier@example.com',
    phone: '+966500000000',
    taxNumber: '300000000000003',
    vatNumber: null,
    bankName: 'Al Rajhi',
    bankIban: 'SA0000000000000000000000',
    notes: null,
    ...overrides,
  });

  beforeEach(() => {
    partnersRepository = {
      findAllPaginated: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
      findOneById: jest.fn().mockResolvedValue(makeVendor()),
      insertPartner: jest.fn().mockResolvedValue('vendor-001'),
      updatePartner: jest.fn().mockResolvedValue(undefined),
      softDeletePartner: jest.fn().mockResolvedValue(undefined),
      findDropdown: jest.fn().mockResolvedValue([]),
    };

    auditService = {
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
    };

    service = new VendorsService(partnersRepository as any, auditService as any);
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should delegate to partnersRepository with isSupplier=true filter', async () => {
      await service.findAll(tenantId, {});

      expect(partnersRepository.findAllPaginated).toHaveBeenCalledWith(tenantId, {
        limit: 20,
        offset: 0,
        search: undefined,
        sortOrder: 'ASC',
        isSupplier: true,
      });
    });

    it('should return paginated results', async () => {
      partnersRepository.findAllPaginated.mockResolvedValue({
        rows: [makeVendor()],
        total: 1,
      });

      const result = await service.findAll(tenantId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should handle custom pagination params', async () => {
      await service.findAll(tenantId, { page: 3, limit: 5, search: 'Supplier' });

      expect(partnersRepository.findAllPaginated).toHaveBeenCalledWith(tenantId, {
        limit: 5,
        offset: 10,
        search: 'Supplier',
        sortOrder: 'ASC',
        isSupplier: true,
      });
    });

    it('should handle empty results', async () => {
      const result = await service.findAll(tenantId, {});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return vendor by id', async () => {
      const result = await service.findById(tenantId, 'vendor-001');

      expect(partnersRepository.findOneById).toHaveBeenCalledWith(tenantId, 'vendor-001');
      expect(result).toBeDefined();
      expect(result!.id).toBe('vendor-001');
    });

    it('should return null when vendor not found', async () => {
      partnersRepository.findOneById.mockResolvedValue(null);

      const result = await service.findById(tenantId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should create a partner with type=SUPPLIER and isSupplier=true', async () => {
      const dto = {
        nameEn: 'New Supplier',
        nameAr: 'مورد جديد',
        email: 'new@example.com',
      };

      const result = await service.create(tenantId, dto as any, auditContext as any);

      expect(partnersRepository.insertPartner).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          type: PartnerType.SUPPLIER,
          isSupplier: true,
          isCustomer: false,
          nameEn: 'New Supplier',
          nameAr: 'مورد جديد',
        }),
      );
      expect(result).toBeDefined();
    });

    it('should set optional fields to null when not provided', async () => {
      const dto = { nameEn: 'Minimal', nameAr: 'حد أدنى' };

      await service.create(tenantId, dto as any, auditContext as any);

      expect(partnersRepository.insertPartner).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          taxNumber: null,
          vatNumber: null,
          phone: null,
          email: null,
          bankName: null,
          bankIban: null,
          notes: null,
        }),
      );
    });

    it('should log audit create event', async () => {
      await service.create(
        tenantId,
        { nameEn: 'Test', nameAr: 'اختبار' } as any,
        auditContext as any,
      );

      expect(auditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'purchasing.vendors',
        'vendor-001',
        expect.any(Object),
        'user-001',
      );
    });

    it('should set createdBy from auditContext', async () => {
      await service.create(
        tenantId,
        { nameEn: 'Test', nameAr: 'اختبار' } as any,
        auditContext as any,
      );

      expect(partnersRepository.insertPartner).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ createdBy: 'user-001' }),
      );
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update vendor fields', async () => {
      const dto = { nameEn: 'Updated Name', email: 'updated@example.com' };

      const result = await service.update(tenantId, 'vendor-001', dto as any, auditContext as any);

      expect(partnersRepository.updatePartner).toHaveBeenCalledWith(
        tenantId,
        'vendor-001',
        expect.arrayContaining(['"nameEn" = :nameEn', 'email = :email']),
        expect.objectContaining({
          nameEn: 'Updated Name',
          email: 'updated@example.com',
        }),
      );
      expect(result).toBeDefined();
    });

    it('should return null when vendor not found', async () => {
      partnersRepository.findOneById.mockResolvedValue(null);

      const result = await service.update(
        tenantId,
        'nonexistent',
        { nameEn: 'X' } as any,
        auditContext as any,
      );

      expect(result).toBeNull();
    });

    it('should return existing record when no fields to update', async () => {
      const existing = makeVendor();
      partnersRepository.findOneById.mockResolvedValue(existing);

      const result = await service.update(tenantId, 'vendor-001', {} as any, auditContext as any);

      expect(partnersRepository.updatePartner).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });

    it('should log audit update event', async () => {
      await service.update(
        tenantId,
        'vendor-001',
        { nameEn: 'Updated' } as any,
        auditContext as any,
      );

      expect(auditService.logUpdate).toHaveBeenCalledWith(
        tenantId,
        'purchasing.vendors',
        'vendor-001',
        expect.any(Object),
        expect.any(Object),
        'user-001',
      );
    });

    it('should update all available fields', async () => {
      const dto = {
        nameEn: 'New EN',
        nameAr: 'New AR',
        email: 'e@e.com',
        phone: '+966511111111',
        taxNumber: '300000000000009',
        vatNumber: 'VAT123',
        bankName: 'SAB',
        bankIban: 'SA999',
        notes: 'Some notes',
      };

      await service.update(tenantId, 'vendor-001', dto as any, auditContext as any);

      const updateCall = partnersRepository.updatePartner.mock.calls[0];
      const updates = updateCall[2] as string[];
      expect(updates).toContain('"nameEn" = :nameEn');
      expect(updates).toContain('"nameAr" = :nameAr');
      expect(updates).toContain('email = :email');
      expect(updates).toContain('phone = :phone');
      expect(updates).toContain('"taxNumber" = :taxNumber');
      expect(updates).toContain('"vatNumber" = :vatNumber');
      expect(updates).toContain('"bankName" = :bankName');
      expect(updates).toContain('"bankIban" = :bankIban');
      expect(updates).toContain('notes = :notes');
    });

    it('should always add updatedBy and updatedAt to update', async () => {
      await service.update(tenantId, 'vendor-001', { nameEn: 'Test' } as any, auditContext as any);

      const updateCall = partnersRepository.updatePartner.mock.calls[0];
      const updates = updateCall[2] as string[];
      expect(updates).toContain('"updatedBy" = :updatedBy');
      expect(updates).toContain('"updatedAt" = NOW()');
    });
  });

  // ─── updateRating ─────────────────────────────────────────────────────────

  describe('updateRating()', () => {
    it('should be a no-op and return the partner', async () => {
      const result = await service.updateRating(
        tenantId,
        'vendor-001',
        { rating: 5 } as any,
        auditContext as any,
      );

      expect(result).toBeDefined();
      expect(partnersRepository.findOneById).toHaveBeenCalledWith(tenantId, 'vendor-001');
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should soft-delete vendor', async () => {
      await service.remove(tenantId, 'vendor-001', auditContext as any);

      expect(partnersRepository.softDeletePartner).toHaveBeenCalledWith(
        tenantId,
        'vendor-001',
        'user-001',
      );
    });

    it('should do nothing when vendor not found', async () => {
      partnersRepository.findOneById.mockResolvedValue(null);

      await service.remove(tenantId, 'nonexistent', auditContext as any);

      expect(partnersRepository.softDeletePartner).not.toHaveBeenCalled();
    });

    it('should log audit delete event', async () => {
      await service.remove(tenantId, 'vendor-001', auditContext as any);

      expect(auditService.logDelete).toHaveBeenCalledWith(
        tenantId,
        'purchasing.vendors',
        'vendor-001',
        expect.any(Object),
        'user-001',
      );
    });
  });

  // ─── getDropdown ──────────────────────────────────────────────────────────

  describe('getDropdown()', () => {
    it('should delegate to partnersRepository with SUPPLIER type', async () => {
      partnersRepository.findDropdown.mockResolvedValue([{ id: 'v1', nameEn: 'Supplier 1' }]);

      const result = await service.getDropdown(tenantId, {});

      expect(partnersRepository.findDropdown).toHaveBeenCalledWith(tenantId, {
        search: undefined,
        limit: 100,
        type: PartnerType.SUPPLIER,
      });
      expect(result).toHaveLength(1);
    });

    it('should pass search and limit parameters', async () => {
      await service.getDropdown(tenantId, { search: 'Acme', limit: 50 });

      expect(partnersRepository.findDropdown).toHaveBeenCalledWith(tenantId, {
        search: 'Acme',
        limit: 50,
        type: PartnerType.SUPPLIER,
      });
    });
  });
});
