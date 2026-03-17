/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock uuid before any imports
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

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
import { ContactsService } from './contacts.service';
import { PartnersService } from '@/modules/partners/services/partners.service';
import { PartnerType } from '@/common/enums/partner.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';

describe('ContactsService', () => {
  let service: ContactsService;

  const mockPartnersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getDropdown: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ContactsService, { provide: PartnersService, useValue: mockPartnersService }],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should delegate to PartnersService with isCustomer=true filter', async () => {
      mockPartnersService.findAll.mockResolvedValue({ data: [], meta: {} });

      await service.findAll(tenantId, { page: 1, limit: 20 } as PaginationDto);

      expect(mockPartnersService.findAll).toHaveBeenCalledWith(tenantId, {
        page: 1,
        limit: 20,
        isCustomer: true,
      });
    });

    it('should pass pagination params through to PartnersService', async () => {
      mockPartnersService.findAll.mockResolvedValue({ data: [], meta: {} });

      await service.findAll(tenantId, { page: 3, limit: 10, search: 'john' } as PaginationDto);

      expect(mockPartnersService.findAll).toHaveBeenCalledWith(tenantId, {
        page: 3,
        limit: 10,
        search: 'john',
        isCustomer: true,
      });
    });

    it('should return whatever PartnersService returns', async () => {
      const expected = { data: [{ id: 'p-1' }], meta: { total: 1 } };
      mockPartnersService.findAll.mockResolvedValue(expected);

      const result = await service.findAll(tenantId, {} as PaginationDto);

      expect(result).toEqual(expected);
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should delegate to PartnersService.findOne', async () => {
      const partner = { id: 'p-1', nameEn: 'Test' };
      mockPartnersService.findOne.mockResolvedValue(partner);

      const result = await service.findById(tenantId, 'p-1');

      expect(mockPartnersService.findOne).toHaveBeenCalledWith(tenantId, 'p-1');
      expect(result).toEqual(partner);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should map contact fields to partner nameEn/nameAr and set type CUSTOMER', async () => {
      const dto = {
        firstNameEn: 'John',
        lastNameEn: 'Doe',
        firstNameAr: 'جون',
        lastNameAr: 'دو',
        email: 'john@test.com',
        phone: '+966500000000',
        notes: 'VIP',
      };

      mockPartnersService.create.mockResolvedValue({ id: 'p-new' });

      await service.create(tenantId, dto as any, auditContext);

      expect(mockPartnersService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          nameEn: 'John Doe',
          nameAr: 'جون دو',
          type: PartnerType.CUSTOMER,
          email: 'john@test.com',
          phone: '+966500000000',
          notes: 'VIP',
        }),
        auditContext,
      );
    });

    it('should construct nameEn from first and last name', async () => {
      const dto = {
        firstNameEn: 'Jane',
        lastNameEn: 'Smith',
        firstNameAr: 'جين',
        lastNameAr: 'سميث',
      };

      mockPartnersService.create.mockResolvedValue({ id: 'p-new' });

      await service.create(tenantId, dto as any, auditContext);

      expect(mockPartnersService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          nameEn: 'Jane Smith',
          nameAr: 'جين سميث',
        }),
        auditContext,
      );
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    beforeEach(() => {
      mockPartnersService.findOne.mockResolvedValue({
        id: 'p-1',
        nameEn: 'John Doe',
        nameAr: 'جون دو',
      });
      mockPartnersService.update.mockResolvedValue({ id: 'p-1' });
    });

    it('should rebuild nameEn when firstNameEn changes', async () => {
      await service.update(tenantId, 'p-1', { firstNameEn: 'Jane' } as any, auditContext);

      expect(mockPartnersService.update).toHaveBeenCalledWith(
        tenantId,
        'p-1',
        expect.objectContaining({ nameEn: 'Jane Doe' }),
        auditContext,
      );
    });

    it('should rebuild nameEn when lastNameEn changes', async () => {
      await service.update(tenantId, 'p-1', { lastNameEn: 'Smith' } as any, auditContext);

      expect(mockPartnersService.update).toHaveBeenCalledWith(
        tenantId,
        'p-1',
        expect.objectContaining({ nameEn: 'John Smith' }),
        auditContext,
      );
    });

    it('should rebuild nameAr when firstNameAr changes', async () => {
      await service.update(tenantId, 'p-1', { firstNameAr: 'جين' } as any, auditContext);

      expect(mockPartnersService.update).toHaveBeenCalledWith(
        tenantId,
        'p-1',
        expect.objectContaining({ nameAr: 'جين دو' }),
        auditContext,
      );
    });

    it('should pass email and phone through', async () => {
      await service.update(
        tenantId,
        'p-1',
        { email: 'new@test.com', phone: '+966511111111' } as any,
        auditContext,
      );

      expect(mockPartnersService.update).toHaveBeenCalledWith(
        tenantId,
        'p-1',
        expect.objectContaining({ email: 'new@test.com', phone: '+966511111111' }),
        auditContext,
      );
    });

    it('should not include name fields if neither first nor last name provided', async () => {
      await service.update(tenantId, 'p-1', { notes: 'Updated' } as any, auditContext);

      const updateArg = mockPartnersService.update.mock.calls[0][2];
      expect(updateArg.nameEn).toBeUndefined();
      expect(updateArg.nameAr).toBeUndefined();
      expect(updateArg.notes).toBe('Updated');
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delegate to PartnersService.remove', async () => {
      await service.remove(tenantId, 'p-1', auditContext);

      expect(mockPartnersService.remove).toHaveBeenCalledWith(tenantId, 'p-1', auditContext);
    });
  });

  // ── getDropdown ──────────────────────────────────────────────────────────────

  describe('getDropdown', () => {
    it('should delegate to PartnersService with type=CUSTOMER', async () => {
      mockPartnersService.getDropdown.mockResolvedValue([]);

      await service.getDropdown(tenantId, { search: 'test' });

      expect(mockPartnersService.getDropdown).toHaveBeenCalledWith(tenantId, {
        search: 'test',
        type: PartnerType.CUSTOMER,
      });
    });
  });
});
