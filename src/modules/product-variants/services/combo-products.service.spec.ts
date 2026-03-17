// Mock uuid before any imports that depend on it
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/combo-products.repository', () => ({
  ComboProductsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/combo-groups.repository', () => ({
  ComboGroupsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/combo-group-items.repository', () => ({
  ComboGroupItemsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/products.repository', () => ({
  ProductsRepository: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ComboProductsService } from './combo-products.service';
import { ComboProductsRepository } from '@/database/sql/repositories/combo-products.repository';
import { ComboGroupsRepository } from '@/database/sql/repositories/combo-groups.repository';
import { ComboGroupItemsRepository } from '@/database/sql/repositories/combo-group-items.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { PaginationDto } from '@/common/dto/pagination.dto';

describe('ComboProductsService', () => {
  let service: ComboProductsService;

  const mockComboRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByProductId: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockGroupsRepo = {
    findByComboId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockItemsRepo = {
    findByGroupId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockProductsRepo = {
    findById: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComboProductsService,
        { provide: ComboProductsRepository, useValue: mockComboRepo },
        { provide: ComboGroupsRepository, useValue: mockGroupsRepo },
        { provide: ComboGroupItemsRepository, useValue: mockItemsRepo },
        { provide: ProductsRepository, useValue: mockProductsRepo },
      ],
    }).compile();

    service = module.get<ComboProductsService>(ComboProductsService);
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated combos', async () => {
      mockComboRepo.findAll.mockResolvedValue({
        rows: [{ id: 'combo-1' }],
        total: 1,
      });

      const result = await service.findAll(tenantId, new PaginationDto());

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('should apply custom page and limit', async () => {
      mockComboRepo.findAll.mockResolvedValue({ rows: [], total: 30 });

      const pagination = Object.assign(new PaginationDto(), { page: 2, limit: 10 });
      const result = await service.findAll(tenantId, pagination);

      expect(mockComboRepo.findAll).toHaveBeenCalledWith(tenantId, {
        limit: 10,
        offset: 10,
        search: undefined,
      });
      expect(result.meta.totalPages).toBe(3);
    });
  });

  // ── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return combo with groups and items', async () => {
      mockComboRepo.findById.mockResolvedValue({ id: 'combo-1' });
      mockGroupsRepo.findByComboId.mockResolvedValue([{ id: 'group-1', nameEn: 'Main Dish' }]);
      mockItemsRepo.findByGroupId.mockResolvedValue([{ id: 'item-1', productId: 'prod-burger' }]);

      const result = await service.findById(tenantId, 'combo-1');

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].items).toHaveLength(1);
    });

    it('should throw NotFoundException when combo not found', async () => {
      mockComboRepo.findById.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create combo for existing product', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1' });
      mockComboRepo.findByProductId.mockResolvedValue(null);
      mockComboRepo.create.mockResolvedValue('combo-new');
      mockComboRepo.findById.mockResolvedValue({ id: 'combo-new', productId: 'prod-1' });
      mockGroupsRepo.findByComboId.mockResolvedValue([]);

      const result = await service.create(tenantId, { productId: 'prod-1' } as any, auditContext);

      expect(mockComboRepo.create).toHaveBeenCalledWith(tenantId, {
        productId: 'prod-1',
        createdBy: 'user-001',
      });
      expect(result.id).toBe('combo-new');
    });

    it('should throw NotFoundException when product not found', async () => {
      mockProductsRepo.findById.mockResolvedValue(null);

      await expect(
        service.create(tenantId, { productId: 'missing' } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when product already a combo', async () => {
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-1' });
      mockComboRepo.findByProductId.mockResolvedValue({ id: 'existing-combo' });

      await expect(
        service.create(tenantId, { productId: 'prod-1' } as any, auditContext),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft-delete existing combo', async () => {
      mockComboRepo.findById.mockResolvedValue({ id: 'combo-1' });

      await service.remove(tenantId, 'combo-1', auditContext);

      expect(mockComboRepo.softDelete).toHaveBeenCalledWith(tenantId, 'combo-1', 'user-001');
    });

    it('should throw NotFoundException when combo not found', async () => {
      mockComboRepo.findById.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── createGroup ────────────────────────────────────────────────────────────

  describe('createGroup', () => {
    it('should create required group with defaults', async () => {
      mockComboRepo.findById.mockResolvedValue({ id: 'combo-1' });
      mockGroupsRepo.create.mockResolvedValue('group-new');
      mockGroupsRepo.findById.mockResolvedValue({
        id: 'group-new',
        nameEn: 'Sides',
        isRequired: true,
        sequence: 0,
      });

      const result = await service.createGroup(
        tenantId,
        { comboId: 'combo-1', nameEn: 'Sides', nameAr: 'جوانب' } as any,
        auditContext,
      );

      expect(mockGroupsRepo.create).toHaveBeenCalledWith(tenantId, {
        comboId: 'combo-1',
        nameEn: 'Sides',
        nameAr: 'جوانب',
        sequence: 0,
        isRequired: true,
        createdBy: 'user-001',
      });
      expect(result.isRequired).toBe(true);
    });

    it('should create optional group', async () => {
      mockComboRepo.findById.mockResolvedValue({ id: 'combo-1' });
      mockGroupsRepo.create.mockResolvedValue('group-opt');
      mockGroupsRepo.findById.mockResolvedValue({ id: 'group-opt', isRequired: false });

      await service.createGroup(
        tenantId,
        {
          comboId: 'combo-1',
          nameEn: 'Add-ons',
          nameAr: 'اضافات',
          isRequired: false,
          sequence: 2,
        } as any,
        auditContext,
      );

      expect(mockGroupsRepo.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ isRequired: false, sequence: 2 }),
      );
    });

    it('should throw NotFoundException when combo not found', async () => {
      mockComboRepo.findById.mockResolvedValue(null);

      await expect(
        service.createGroup(tenantId, { comboId: 'missing' } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateGroup ────────────────────────────────────────────────────────────

  describe('updateGroup', () => {
    const existingGroup = { id: 'group-1', version: 2 };

    it('should update group on version match', async () => {
      mockGroupsRepo.findById
        .mockResolvedValueOnce(existingGroup)
        .mockResolvedValueOnce({ ...existingGroup, nameEn: 'Main' });
      mockGroupsRepo.update.mockResolvedValue(undefined);

      const result = await service.updateGroup(
        tenantId,
        'group-1',
        { version: 2, nameEn: 'Main', isRequired: false } as any,
        auditContext,
      );

      expect(mockGroupsRepo.update).toHaveBeenCalledWith(
        tenantId,
        'group-1',
        expect.arrayContaining(['"nameEn" = :nameEn', '"isRequired" = :isRequired']),
        expect.objectContaining({ nameEn: 'Main', isRequired: false }),
      );
    });

    it('should throw ConflictException on version mismatch', async () => {
      mockGroupsRepo.findById.mockResolvedValue(existingGroup);

      await expect(
        service.updateGroup(tenantId, 'group-1', { version: 0 } as any, auditContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when group not found', async () => {
      mockGroupsRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateGroup(tenantId, 'missing', { version: 0 } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── removeGroup ────────────────────────────────────────────────────────────

  describe('removeGroup', () => {
    it('should soft-delete existing group', async () => {
      mockGroupsRepo.findById.mockResolvedValue({ id: 'group-1' });

      await service.removeGroup(tenantId, 'group-1', auditContext);

      expect(mockGroupsRepo.softDelete).toHaveBeenCalledWith(tenantId, 'group-1', 'user-001');
    });

    it('should throw NotFoundException when group not found', async () => {
      mockGroupsRepo.findById.mockResolvedValue(null);

      await expect(service.removeGroup(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── createItem ─────────────────────────────────────────────────────────────

  describe('createItem', () => {
    it('should create item with extra price', async () => {
      mockGroupsRepo.findById.mockResolvedValue({ id: 'group-1' });
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-fries' });
      mockItemsRepo.create.mockResolvedValue('item-new');
      mockItemsRepo.findById.mockResolvedValue({
        id: 'item-new',
        groupId: 'group-1',
        productId: 'prod-fries',
        extraPrice: 3.5,
        sequence: 1,
      });

      const result = await service.createItem(
        tenantId,
        { groupId: 'group-1', productId: 'prod-fries', extraPrice: 3.5, sequence: 1 } as any,
        auditContext,
      );

      expect(mockItemsRepo.create).toHaveBeenCalledWith(tenantId, {
        groupId: 'group-1',
        productId: 'prod-fries',
        extraPrice: 3.5,
        sequence: 1,
        createdBy: 'user-001',
      });
      expect(result.extraPrice).toBe(3.5);
    });

    it('should default extraPrice to 0 and sequence to 0', async () => {
      mockGroupsRepo.findById.mockResolvedValue({ id: 'group-1' });
      mockProductsRepo.findById.mockResolvedValue({ id: 'prod-cola' });
      mockItemsRepo.create.mockResolvedValue('item-2');
      mockItemsRepo.findById.mockResolvedValue({ id: 'item-2' });

      await service.createItem(
        tenantId,
        { groupId: 'group-1', productId: 'prod-cola' } as any,
        auditContext,
      );

      expect(mockItemsRepo.create).toHaveBeenCalledWith(tenantId, {
        groupId: 'group-1',
        productId: 'prod-cola',
        extraPrice: 0,
        sequence: 0,
        createdBy: 'user-001',
      });
    });

    it('should throw NotFoundException when group not found', async () => {
      mockGroupsRepo.findById.mockResolvedValue(null);

      await expect(
        service.createItem(
          tenantId,
          { groupId: 'missing', productId: 'prod-1' } as any,
          auditContext,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockGroupsRepo.findById.mockResolvedValue({ id: 'group-1' });
      mockProductsRepo.findById.mockResolvedValue(null);

      await expect(
        service.createItem(
          tenantId,
          { groupId: 'group-1', productId: 'missing' } as any,
          auditContext,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateItem ─────────────────────────────────────────────────────────────

  describe('updateItem', () => {
    const existingItem = { id: 'item-1', version: 1 };

    it('should update extraPrice and sequence on version match', async () => {
      mockItemsRepo.findById
        .mockResolvedValueOnce(existingItem)
        .mockResolvedValueOnce({ ...existingItem, extraPrice: 5 });
      mockItemsRepo.update.mockResolvedValue(undefined);

      await service.updateItem(
        tenantId,
        'item-1',
        { version: 1, extraPrice: 5, sequence: 3 } as any,
        auditContext,
      );

      expect(mockItemsRepo.update).toHaveBeenCalledWith(
        tenantId,
        'item-1',
        expect.arrayContaining(['"extraPrice" = :extraPrice', 'sequence = :sequence']),
        expect.objectContaining({ extraPrice: 5, sequence: 3 }),
      );
    });

    it('should throw ConflictException on version mismatch', async () => {
      mockItemsRepo.findById.mockResolvedValue(existingItem);

      await expect(
        service.updateItem(tenantId, 'item-1', { version: 99 } as any, auditContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when item not found', async () => {
      mockItemsRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateItem(tenantId, 'missing', { version: 0 } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── removeItem ─────────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('should soft-delete existing item', async () => {
      mockItemsRepo.findById.mockResolvedValue({ id: 'item-1' });

      await service.removeItem(tenantId, 'item-1', auditContext);

      expect(mockItemsRepo.softDelete).toHaveBeenCalledWith(tenantId, 'item-1', 'user-001');
    });

    it('should throw NotFoundException when item not found', async () => {
      mockItemsRepo.findById.mockResolvedValue(null);

      await expect(service.removeItem(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findGroupsByCombo ──────────────────────────────────────────────────────

  describe('findGroupsByCombo', () => {
    it('should return groups with their items', async () => {
      mockComboRepo.findById.mockResolvedValue({ id: 'combo-1' });
      mockGroupsRepo.findByComboId.mockResolvedValue([
        { id: 'g1', nameEn: 'Main' },
        { id: 'g2', nameEn: 'Sides' },
      ]);
      mockItemsRepo.findByGroupId
        .mockResolvedValueOnce([{ id: 'i1' }])
        .mockResolvedValueOnce([{ id: 'i2' }, { id: 'i3' }]);

      const result = await service.findGroupsByCombo(tenantId, 'combo-1');

      expect(result).toHaveLength(2);
      expect(result[0].items).toHaveLength(1);
      expect(result[1].items).toHaveLength(2);
    });

    it('should throw NotFoundException when combo not found', async () => {
      mockComboRepo.findById.mockResolvedValue(null);

      await expect(service.findGroupsByCombo(tenantId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findItemsByGroup ───────────────────────────────────────────────────────

  describe('findItemsByGroup', () => {
    it('should return items for a group', async () => {
      mockGroupsRepo.findById.mockResolvedValue({ id: 'group-1' });
      mockItemsRepo.findByGroupId.mockResolvedValue([{ id: 'item-1' }, { id: 'item-2' }]);

      const result = await service.findItemsByGroup(tenantId, 'group-1');

      expect(result).toHaveLength(2);
    });

    it('should throw NotFoundException when group not found', async () => {
      mockGroupsRepo.findById.mockResolvedValue(null);

      await expect(service.findItemsByGroup(tenantId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
