/* eslint-disable @typescript-eslint/no-unused-vars */
import { NotFoundException } from '@nestjs/common';

// Mock all repository/entity imports to prevent entity imports (which pull in uuid ESM)
jest.mock('@/database/sql/repositories/audit-logs.repository', () => ({
  AuditLogsRepository: jest.fn(),
}));
jest.mock('@/database/sql/entities/audit-log.entity', () => ({
  AuditLog: jest.fn(),
}));

import { AuditLogQueryService } from './audit-log-query.service';

describe('AuditLogQueryService', () => {
  let service: AuditLogQueryService;
  let auditLogsRepository: Record<string, jest.Mock>;

  const tenantSlug = 'test-tenant';

  beforeEach(() => {
    auditLogsRepository = {
      rawQuery: jest.fn(),
    };

    service = new AuditLogQueryService(auditLogsRepository as any);
  });

  describe('list()', () => {
    it('should default to last 30 days when no date range provided', async () => {
      auditLogsRepository.rawQuery
        .mockResolvedValueOnce([{ total: 0 }]) // count query
        .mockResolvedValueOnce([]); // data query

      await service.list(tenantSlug, {});

      const countCallReplacements = auditLogsRepository.rawQuery.mock.calls[0][1];
      expect(countCallReplacements.from).toBeDefined();
      expect(countCallReplacements.from).toBeInstanceOf(Date);

      // Verify it is approximately 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const diff = Math.abs(
        countCallReplacements.from.getTime() - thirtyDaysAgo.getTime(),
      );
      expect(diff).toBeLessThan(5000); // within 5 seconds
    });

    it('should paginate with max 100 per page', async () => {
      auditLogsRepository.rawQuery
        .mockResolvedValueOnce([{ total: 200 }])
        .mockResolvedValueOnce([]);

      await service.list(tenantSlug, { limit: 500 } as any);

      // Both calls use the same replacements object built before Promise.all
      const countCallReplacements = auditLogsRepository.rawQuery.mock.calls[0][1];
      expect(countCallReplacements.limit).toBe(100);
    });

    it('should filter by tenantSlug first', async () => {
      auditLogsRepository.rawQuery
        .mockResolvedValueOnce([{ total: 5 }])
        .mockResolvedValueOnce([
          { id: '1', tenantSlug, action: 'create', entity: 'projects' },
        ]);

      await service.list(tenantSlug, {});

      const countSql = auditLogsRepository.rawQuery.mock.calls[0][0];
      expect(countSql).toContain('"tenantSlug" = :tenantSlug');

      const replacements = auditLogsRepository.rawQuery.mock.calls[0][1];
      expect(replacements.tenantSlug).toBe(tenantSlug);
    });

    it('should return paginated result with correct meta', async () => {
      const mockRows = [
        { id: '1', action: 'create', entity: 'projects' },
        { id: '2', action: 'update', entity: 'projects' },
      ];

      auditLogsRepository.rawQuery
        .mockResolvedValueOnce([{ total: 50 }])
        .mockResolvedValueOnce(mockRows);

      const result = await service.list(tenantSlug, { page: 2, limit: 20 } as any);

      expect(result.data).toEqual(mockRows);
      expect(result.meta).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
      });
    });
  });

  describe('findById()', () => {
    it('should return audit log entry when found', async () => {
      const entry = {
        id: 'log-1',
        tenantSlug,
        action: 'create',
        entity: 'projects',
        entityId: 'proj-1',
        oldValues: null,
        newValues: { nameEn: 'Test' },
      };

      auditLogsRepository.rawQuery.mockResolvedValue([entry]);

      const result = await service.findById(tenantSlug, 'log-1');

      expect(result).toEqual(entry);
    });

    it('should throw NotFoundException when missing', async () => {
      auditLogsRepository.rawQuery.mockResolvedValue([]);

      await expect(service.findById(tenantSlug, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getEntityHistory()', () => {
    it('should return entries with computed diff', async () => {
      const rows = [
        {
          id: 'log-2',
          action: 'update',
          entity: 'projects',
          entityId: 'proj-1',
          oldValues: { nameEn: 'Old Name' },
          newValues: { nameEn: 'New Name' },
          createdAt: new Date('2026-03-14T10:00:00Z'),
        },
        {
          id: 'log-1',
          action: 'create',
          entity: 'projects',
          entityId: 'proj-1',
          oldValues: null,
          newValues: { nameEn: 'Old Name' },
          createdAt: new Date('2026-03-13T10:00:00Z'),
        },
      ];

      auditLogsRepository.rawQuery.mockResolvedValue(rows);

      const result = await service.getEntityHistory(tenantSlug, 'projects', 'proj-1');

      expect(result).toHaveLength(2);

      // First entry (update) should have diff showing nameEn change
      expect(result[0].diff).toEqual({
        nameEn: { from: 'Old Name', to: 'New Name' },
      });

      // Second entry (create) should show all fields as new
      expect(result[1].diff).toEqual({
        nameEn: { from: undefined, to: 'Old Name' },
      });
    });
  });

  describe('computeDiff()', () => {
    let computeDiff: (
      oldValues: Record<string, unknown> | null | undefined,
      newValues: Record<string, unknown> | null | undefined,
    ) => Record<string, { from: unknown; to: unknown }>;

    beforeEach(() => {
      computeDiff = (service as any).computeDiff.bind(service);
    });

    it('should return changed fields with from/to values', () => {
      const result = computeDiff(
        { nameEn: 'Old', status: 'active', budget: 100 },
        { nameEn: 'New', status: 'active', budget: 200 },
      );

      expect(result).toEqual({
        nameEn: { from: 'Old', to: 'New' },
        budget: { from: 100, to: 200 },
      });
      expect(result.status).toBeUndefined();
    });

    it('should handle null oldValues', () => {
      const result = computeDiff(null, { nameEn: 'Created', status: 'planning' });

      expect(result).toEqual({
        nameEn: { from: undefined, to: 'Created' },
        status: { from: undefined, to: 'planning' },
      });
    });

    it('should handle null newValues', () => {
      const result = computeDiff({ nameEn: 'Deleted', status: 'active' }, null);

      expect(result).toEqual({
        nameEn: { from: 'Deleted', to: undefined },
        status: { from: 'active', to: undefined },
      });
    });

    it('should return empty diff when both are null', () => {
      const result = computeDiff(null, null);
      expect(result).toEqual({});
    });

    it('should return empty diff when no changes', () => {
      const result = computeDiff(
        { nameEn: 'Same', status: 'active' },
        { nameEn: 'Same', status: 'active' },
      );
      expect(result).toEqual({});
    });
  });
});
