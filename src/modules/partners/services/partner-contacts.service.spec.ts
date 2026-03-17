// Mock uuid before any imports that depend on it (BaseEntity uses uuid)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

// Mock repository modules to avoid entity import issues
jest.mock('@/database/sql/repositories/partner-contacts.repository', () => ({
  PartnerContactsRepository: jest.fn(),
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
import { NotFoundException } from '@nestjs/common';
import { PartnerContactsService } from './partner-contacts.service';
import { PartnerContactsRepository } from '@/database/sql/repositories/partner-contacts.repository';
import { PartnersRepository } from '@/database/sql/repositories/partners.repository';
import { AuditSharedService } from '@/shared/services/audit-shared.service';

describe('PartnerContactsService', () => {
  let service: PartnerContactsService;

  const mockContactsRepo = {
    findAllByPartnerId: jest.fn(),
    findOneById: jest.fn(),
    insertPartnerContact: jest.fn(),
    updatePartnerContact: jest.fn(),
    softDeletePartnerContact: jest.fn(),
  };

  const mockPartnersRepo = {
    findOneById: jest.fn(),
  };

  const mockAuditService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerContactsService,
        { provide: PartnerContactsRepository, useValue: mockContactsRepo },
        { provide: PartnersRepository, useValue: mockPartnersRepo },
        { provide: AuditSharedService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PartnerContactsService>(PartnerContactsService);
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated contacts for a partner', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue({ id: 'p-1' });
      mockContactsRepo.findAllByPartnerId.mockResolvedValue({
        rows: [{ id: 'c-1', firstName: 'John' }],
        total: 1,
      });

      const result = await service.findAll(tenantId, 'p-1', {} as any);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('should throw NotFoundException when partner does not exist', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue(null);

      await expect(service.findAll(tenantId, 'missing-partner', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use custom pagination', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue({ id: 'p-1' });
      mockContactsRepo.findAllByPartnerId.mockResolvedValue({ rows: [], total: 30 });

      const result = await service.findAll(tenantId, 'p-1', { page: 2, limit: 10 } as any);

      expect(mockContactsRepo.findAllByPartnerId).toHaveBeenCalledWith(
        tenantId,
        'p-1',
        expect.objectContaining({ limit: 10, offset: 10 }),
      );
      expect(result.meta.totalPages).toBe(3);
    });

    it('should pass search and sortOrder params', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue({ id: 'p-1' });
      mockContactsRepo.findAllByPartnerId.mockResolvedValue({ rows: [], total: 0 });

      await service.findAll(tenantId, 'p-1', { search: 'john', sortOrder: 'DESC' } as any);

      expect(mockContactsRepo.findAllByPartnerId).toHaveBeenCalledWith(
        tenantId,
        'p-1',
        expect.objectContaining({ search: 'john', sortOrder: 'DESC' }),
      );
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return contact when found', async () => {
      const contact = { id: 'c-1', firstName: 'John' };
      mockContactsRepo.findOneById.mockResolvedValue(contact);

      const result = await service.findOne(tenantId, 'c-1');

      expect(result).toEqual(contact);
    });

    it('should throw NotFoundException when contact does not exist', async () => {
      mockContactsRepo.findOneById.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      partnerId: 'p-1',
      firstName: 'John',
    };

    beforeEach(() => {
      mockPartnersRepo.findOneById.mockResolvedValue({ id: 'p-1' });
      mockContactsRepo.insertPartnerContact.mockResolvedValue('new-contact-id');
      mockContactsRepo.findOneById.mockResolvedValue({
        id: 'new-contact-id',
        ...baseDto,
      });
    });

    it('should verify partner exists before creating contact', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockPartnersRepo.findOneById).toHaveBeenCalledWith(tenantId, 'p-1');
    });

    it('should throw NotFoundException when partner does not exist', async () => {
      mockPartnersRepo.findOneById.mockResolvedValue(null);

      await expect(service.create(tenantId, baseDto, auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create contact with correct data', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockContactsRepo.insertPartnerContact).toHaveBeenCalledWith(tenantId, {
        partnerId: 'p-1',
        firstName: 'John',
        lastName: null,
        phone: null,
        mobile: null,
        email: null,
        position: null,
        isMain: false,
        createdBy: 'user-001',
      });
    });

    it('should pass optional fields when provided', async () => {
      const fullDto = {
        ...baseDto,
        lastName: 'Doe',
        phone: '+966501234567',
        mobile: '+966551234567',
        email: 'john@example.com',
        position: 'CEO',
        isMain: true,
      };

      await service.create(tenantId, fullDto, auditContext);

      expect(mockContactsRepo.insertPartnerContact).toHaveBeenCalledWith(tenantId, {
        partnerId: 'p-1',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+966501234567',
        mobile: '+966551234567',
        email: 'john@example.com',
        position: 'CEO',
        isMain: true,
        createdBy: 'user-001',
      });
    });

    it('should call audit service logCreate', async () => {
      await service.create(tenantId, baseDto, auditContext);

      expect(mockAuditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'partners.partner_contacts',
        'new-contact-id',
        expect.any(Object),
        auditContext.userId,
      );
    });

    it('should return the created contact', async () => {
      const result = await service.create(tenantId, baseDto, auditContext);

      expect(result).toEqual(expect.objectContaining({ id: 'new-contact-id' }));
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const existingContact = {
      id: 'c-1',
      partnerId: 'p-1',
      firstName: 'John',
      lastName: 'Doe',
    };

    beforeEach(() => {
      mockContactsRepo.findOneById.mockResolvedValue(existingContact);
    });

    it('should throw NotFoundException when contact does not exist', async () => {
      mockContactsRepo.findOneById.mockResolvedValueOnce(null);

      await expect(
        service.update(tenantId, 'missing', { firstName: 'Jane' } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update firstName', async () => {
      await service.update(tenantId, 'c-1', { firstName: 'Jane' } as any, auditContext);

      expect(mockContactsRepo.updatePartnerContact).toHaveBeenCalledWith(
        tenantId,
        'c-1',
        expect.arrayContaining(['"firstName" = :firstName']),
        expect.objectContaining({ firstName: 'Jane' }),
      );
    });

    it('should update multiple fields', async () => {
      await service.update(
        tenantId,
        'c-1',
        { firstName: 'Jane', email: 'jane@test.com', isMain: true } as any,
        auditContext,
      );

      expect(mockContactsRepo.updatePartnerContact).toHaveBeenCalledWith(
        tenantId,
        'c-1',
        expect.arrayContaining([
          '"firstName" = :firstName',
          'email = :email',
          '"isMain" = :isMain',
        ]),
        expect.objectContaining({ firstName: 'Jane', email: 'jane@test.com', isMain: true }),
      );
    });

    it('should always include updatedBy and updatedAt', async () => {
      await service.update(tenantId, 'c-1', { firstName: 'X' } as any, auditContext);

      expect(mockContactsRepo.updatePartnerContact).toHaveBeenCalledWith(
        tenantId,
        'c-1',
        expect.arrayContaining(['"updatedBy" = :updatedBy', '"updatedAt" = NOW()']),
        expect.objectContaining({ updatedBy: 'user-001' }),
      );
    });

    it('should call audit service logUpdate with before and after', async () => {
      const updated = { ...existingContact, firstName: 'Jane' };
      mockContactsRepo.findOneById
        .mockResolvedValueOnce(existingContact)
        .mockResolvedValueOnce(updated);

      await service.update(tenantId, 'c-1', { firstName: 'Jane' } as any, auditContext);

      expect(mockAuditService.logUpdate).toHaveBeenCalledWith(
        tenantId,
        'partners.partner_contacts',
        'c-1',
        expect.objectContaining({ firstName: 'John' }),
        updated,
        auditContext.userId,
      );
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete the contact', async () => {
      mockContactsRepo.findOneById.mockResolvedValue({ id: 'c-1' });

      await service.remove(tenantId, 'c-1', auditContext);

      expect(mockContactsRepo.softDeletePartnerContact).toHaveBeenCalledWith(
        tenantId,
        'c-1',
        'user-001',
      );
    });

    it('should call audit service logDelete', async () => {
      mockContactsRepo.findOneById.mockResolvedValue({ id: 'c-1' });

      await service.remove(tenantId, 'c-1', auditContext);

      expect(mockAuditService.logDelete).toHaveBeenCalledWith(
        tenantId,
        'partners.partner_contacts',
        'c-1',
        expect.any(Object),
        auditContext.userId,
      );
    });

    it('should throw NotFoundException when contact does not exist', async () => {
      mockContactsRepo.findOneById.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
