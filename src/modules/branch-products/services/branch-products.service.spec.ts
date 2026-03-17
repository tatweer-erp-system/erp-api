// Mock uuid before any imports that depend on it
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/branch-products.repository', () => ({
  BranchProductsRepository: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BranchProductsService } from './branch-products.service';
import { BranchProductsRepository } from '@/database/sql/repositories/branch-products.repository';
import { AuditSharedService } from '@/shared/services/audit-shared.service';

describe('BranchProductsService', () => {
  let service: BranchProductsService;

  const mockBranchProductsRepo = {
    findByBranch: jest.fn(),
    bulkAssign: jest.fn(),
    bulkUnassign: jest.fn(),
  };

  const mockAuditService = {
    logCreate: jest.fn(),
    logDelete: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };
  const branchId = 'branch-001';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchProductsService,
        { provide: BranchProductsRepository, useValue: mockBranchProductsRepo },
        { provide: AuditSharedService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<BranchProductsService>(BranchProductsService);
  });

  // ── getAssigned ────────────────────────────────────────────────────────────

  describe('getAssigned', () => {
    it('should return all products assigned to a branch', async () => {
      const products = [
        { id: 'bp-1', productId: 'prod-1', branchId },
        { id: 'bp-2', productId: 'prod-2', branchId },
      ];
      mockBranchProductsRepo.findByBranch.mockResolvedValue(products);

      const result = await service.getAssigned(tenantId, branchId);

      expect(mockBranchProductsRepo.findByBranch).toHaveBeenCalledWith(tenantId, branchId);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no products assigned', async () => {
      mockBranchProductsRepo.findByBranch.mockResolvedValue([]);

      const result = await service.getAssigned(tenantId, branchId);

      expect(result).toEqual([]);
    });
  });

  // ── assign ─────────────────────────────────────────────────────────────────

  describe('assign', () => {
    it('should bulk assign products and return count', async () => {
      mockBranchProductsRepo.bulkAssign.mockResolvedValue(3);

      const productIds = ['prod-1', 'prod-2', 'prod-3'];
      const result = await service.assign(tenantId, branchId, productIds, auditContext);

      expect(mockBranchProductsRepo.bulkAssign).toHaveBeenCalledWith(
        tenantId,
        branchId,
        productIds,
        'user-001',
      );
      expect(result).toEqual({ assigned: 3 });
    });

    it('should log audit after assignment', async () => {
      mockBranchProductsRepo.bulkAssign.mockResolvedValue(2);

      await service.assign(tenantId, branchId, ['prod-1', 'prod-2'], auditContext);

      expect(mockAuditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'inventory.branch_products',
        branchId,
        { branchId, productIds: ['prod-1', 'prod-2'], assigned: 2 },
        'user-001',
      );
    });

    it('should handle assigning zero products', async () => {
      mockBranchProductsRepo.bulkAssign.mockResolvedValue(0);

      const result = await service.assign(tenantId, branchId, [], auditContext);

      expect(result).toEqual({ assigned: 0 });
    });

    it('should handle duplicates gracefully (repo returns lower count)', async () => {
      mockBranchProductsRepo.bulkAssign.mockResolvedValue(1);

      const result = await service.assign(tenantId, branchId, ['prod-1', 'prod-1'], auditContext);

      expect(result).toEqual({ assigned: 1 });
    });
  });

  // ── unassign ───────────────────────────────────────────────────────────────

  describe('unassign', () => {
    it('should bulk unassign products and return count', async () => {
      mockBranchProductsRepo.bulkUnassign.mockResolvedValue(2);

      const productIds = ['prod-1', 'prod-2'];
      const result = await service.unassign(tenantId, branchId, productIds, auditContext);

      expect(mockBranchProductsRepo.bulkUnassign).toHaveBeenCalledWith(
        tenantId,
        branchId,
        productIds,
        'user-001',
      );
      expect(result).toEqual({ unassigned: 2 });
    });

    it('should log audit after unassignment', async () => {
      mockBranchProductsRepo.bulkUnassign.mockResolvedValue(1);

      await service.unassign(tenantId, branchId, ['prod-1'], auditContext);

      expect(mockAuditService.logDelete).toHaveBeenCalledWith(
        tenantId,
        'inventory.branch_products',
        branchId,
        { branchId, productIds: ['prod-1'], unassigned: 1 },
        'user-001',
      );
    });

    it('should handle unassigning products not currently assigned', async () => {
      mockBranchProductsRepo.bulkUnassign.mockResolvedValue(0);

      const result = await service.unassign(tenantId, branchId, ['prod-nonexistent'], auditContext);

      expect(result).toEqual({ unassigned: 0 });
    });
  });
});
