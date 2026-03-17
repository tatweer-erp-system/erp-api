// Mock uuid before any imports
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/activities.repository', () => ({
  ActivitiesRepository: jest.fn(),
}));

// Mock CLS for msg() helper
jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesRepository } from '@/database/sql/repositories/activities.repository';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { ActivityType } from '@/common/enums/activity.enums';

describe('ActivitiesService', () => {
  let service: ActivitiesService;

  const mockActivitiesRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createTransaction: jest.fn(),
  };

  const mockAuditService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
    logStatusChange: jest.fn(),
  };

  const mockOutboxSharedService = {
    createEvent: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: ActivitiesRepository, useValue: mockActivitiesRepo },
        { provide: AuditSharedService, useValue: mockAuditService },
        { provide: OutboxSharedService, useValue: mockOutboxSharedService },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated activities with default sort by scheduledDate ASC', async () => {
      mockActivitiesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { page: 1, limit: 20 } as any);

      expect(mockActivitiesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          sortBy: 'scheduledDate',
          sortOrder: 'ASC',
          tenantId,
        }),
      );
    });

    it('should pass model filter to where clause', async () => {
      mockActivitiesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { model: 'leads' } as any);

      expect(mockActivitiesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ model: 'leads' }),
        }),
      );
    });

    it('should pass recordId filter to where clause', async () => {
      mockActivitiesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { recordId: 'rec-1' } as any);

      expect(mockActivitiesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ recordId: 'rec-1' }),
        }),
      );
    });

    it('should pass assignedTo filter to where clause', async () => {
      mockActivitiesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { assignedTo: 'user-002' } as any);

      expect(mockActivitiesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assignedTo: 'user-002' }),
        }),
      );
    });

    it('should pass isDone filter to where clause', async () => {
      mockActivitiesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { isDone: false } as any);

      expect(mockActivitiesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isDone: false }),
        }),
      );
    });

    it('should use search fields summary and recordName', async () => {
      mockActivitiesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { search: 'test' } as any);

      expect(mockActivitiesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'test',
          searchFields: ['summary', 'recordName'],
        }),
      );
    });
  });

  // ── findMyActivities ─────────────────────────────────────────────────────────

  describe('findMyActivities', () => {
    it('should filter by current user assignedTo', async () => {
      mockActivitiesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findMyActivities(tenantId, 'user-001', {} as any);

      expect(mockActivitiesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assignedTo: 'user-001' }),
          tenantId,
        }),
      );
    });

    it('should merge query filters with userId filter', async () => {
      mockActivitiesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findMyActivities(tenantId, 'user-001', { isDone: false } as any);

      expect(mockActivitiesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedTo: 'user-001',
            isDone: false,
          }),
        }),
      );
    });
  });

  // ── findOverdue ──────────────────────────────────────────────────────────────

  describe('findOverdue', () => {
    it('should filter by isDone=false and scheduledDate < today', async () => {
      mockActivitiesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findOverdue(tenantId, {} as any);

      expect(mockActivitiesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDone: false,
            scheduledDate: expect.any(Object),
          }),
          tenantId,
        }),
      );
    });
  });

  // ── findByRecord ─────────────────────────────────────────────────────────────

  describe('findByRecord', () => {
    it('should filter by model and recordId', async () => {
      mockActivitiesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findByRecord(tenantId, 'leads', 'lead-1', {} as any);

      expect(mockActivitiesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            model: 'leads',
            recordId: 'lead-1',
          }),
          tenantId,
        }),
      );
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    const createDto = {
      model: 'leads',
      recordId: 'lead-1',
      recordName: 'Big Deal',
      activityType: ActivityType.CALL,
      summary: 'Follow up call',
      scheduledDate: '2026-03-20',
      assignedTo: 'user-002',
    };

    it('should create activity with isDone=false', async () => {
      const createdActivity = { id: 'act-1', ...createDto, isDone: false };
      mockActivitiesRepo.create.mockResolvedValue(createdActivity);

      await service.create(tenantId, createDto as any, auditContext);

      expect(mockActivitiesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'leads',
          recordId: 'lead-1',
          recordName: 'Big Deal',
          activityType: ActivityType.CALL,
          summary: 'Follow up call',
          scheduledDate: '2026-03-20',
          assignedTo: 'user-002',
          isDone: false,
        }),
        { auditContext, tenantId },
      );
    });

    it('should set optional fields to null when not provided', async () => {
      const minimalDto = {
        model: 'leads',
        recordId: 'lead-1',
        activityType: ActivityType.TODO,
        summary: 'Task',
        scheduledDate: '2026-03-20',
        assignedTo: 'user-002',
      };
      mockActivitiesRepo.create.mockResolvedValue({ id: 'act-1', ...minimalDto });

      await service.create(tenantId, minimalDto as any, auditContext);

      expect(mockActivitiesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recordName: null,
          icon: null,
          note: null,
        }),
        expect.any(Object),
      );
    });

    it('should log audit create event', async () => {
      const created = { id: 'act-1', ...createDto };
      mockActivitiesRepo.create.mockResolvedValue(created);

      await service.create(tenantId, createDto as any, auditContext);

      expect(mockAuditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'activities',
        'act-1',
        expect.any(Object),
        'user-001',
      );
    });

    it('should return the created activity', async () => {
      const created = { id: 'act-1', ...createDto };
      mockActivitiesRepo.create.mockResolvedValue(created);

      const result = await service.create(tenantId, createDto as any, auditContext);

      expect(result).toEqual(created);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    const existingActivity = {
      id: 'act-1',
      model: 'leads',
      recordId: 'lead-1',
      summary: 'Old summary',
      isDone: false,
    };

    beforeEach(() => {
      mockActivitiesRepo.findById.mockResolvedValue(existingActivity);
    });

    it('should update activity fields', async () => {
      const updated = { ...existingActivity, summary: 'New summary' };
      mockActivitiesRepo.update.mockResolvedValue(updated);

      await service.update(tenantId, 'act-1', { summary: 'New summary' } as any, auditContext);

      expect(mockActivitiesRepo.update).toHaveBeenCalledWith(
        'act-1',
        expect.objectContaining({ summary: 'New summary' }),
        expect.objectContaining({ auditContext, tenantId }),
      );
    });

    it('should throw BadRequestException when activity is already done', async () => {
      mockActivitiesRepo.findById.mockResolvedValue({ ...existingActivity, isDone: true });

      await expect(
        service.update(tenantId, 'act-1', { summary: 'New' } as any, auditContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should log audit update event', async () => {
      mockActivitiesRepo.update.mockResolvedValue({ ...existingActivity, summary: 'New' });

      await service.update(tenantId, 'act-1', { summary: 'New' } as any, auditContext);

      expect(mockAuditService.logUpdate).toHaveBeenCalledWith(
        tenantId,
        'activities',
        'act-1',
        expect.any(Object),
        expect.any(Object),
        'user-001',
      );
    });

    it('should only update provided fields', async () => {
      mockActivitiesRepo.update.mockResolvedValue(existingActivity);

      await service.update(tenantId, 'act-1', { assignedTo: 'user-003' } as any, auditContext);

      expect(mockActivitiesRepo.update).toHaveBeenCalledWith(
        'act-1',
        { assignedTo: 'user-003' },
        expect.any(Object),
      );
    });
  });

  // ── markDone ─────────────────────────────────────────────────────────────────

  describe('markDone', () => {
    const existingActivity = {
      id: 'act-1',
      model: 'leads',
      recordId: 'lead-1',
      activityType: ActivityType.CALL,
      summary: 'Follow up',
      isDone: false,
    };

    const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    beforeEach(() => {
      mockActivitiesRepo.findById.mockResolvedValue(existingActivity);
      mockActivitiesRepo.createTransaction.mockResolvedValue(mockTransaction);
    });

    it('should set isDone=true, doneAt=now, doneByUserId', async () => {
      const updated = { ...existingActivity, isDone: true };
      mockActivitiesRepo.update.mockResolvedValue(updated);

      await service.markDone(tenantId, 'act-1', {} as any, auditContext);

      expect(mockActivitiesRepo.update).toHaveBeenCalledWith(
        'act-1',
        expect.objectContaining({
          isDone: true,
          doneAt: expect.any(Date),
          doneByUserId: 'user-001',
          feedbackNote: null,
        }),
        expect.objectContaining({ auditContext, tenantId, transaction: mockTransaction }),
      );
    });

    it('should record feedbackNote when provided', async () => {
      mockActivitiesRepo.update.mockResolvedValue({ ...existingActivity, isDone: true });

      await service.markDone(
        tenantId,
        'act-1',
        { feedbackNote: 'Client confirmed' } as any,
        auditContext,
      );

      expect(mockActivitiesRepo.update).toHaveBeenCalledWith(
        'act-1',
        expect.objectContaining({ feedbackNote: 'Client confirmed' }),
        expect.any(Object),
      );
    });

    it('should emit ACTIVITY_COMPLETED outbox event', async () => {
      mockActivitiesRepo.update.mockResolvedValue({ ...existingActivity, isDone: true });

      await service.markDone(tenantId, 'act-1', {} as any, auditContext);

      expect(mockOutboxSharedService.createEvent).toHaveBeenCalledWith(
        mockTransaction,
        tenantId,
        'ACTIVITY_COMPLETED',
        expect.objectContaining({
          activityId: 'act-1',
          model: 'leads',
          recordId: 'lead-1',
          activityType: ActivityType.CALL,
          summary: 'Follow up',
          completedBy: 'user-001',
        }),
        'act-1',
        'activity',
      );
    });

    it('should log audit status change from pending to done', async () => {
      mockActivitiesRepo.update.mockResolvedValue({ ...existingActivity, isDone: true });

      await service.markDone(tenantId, 'act-1', {} as any, auditContext);

      expect(mockAuditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'activities',
        'act-1',
        'pending',
        'done',
        'user-001',
      );
    });

    it('should commit transaction on success', async () => {
      mockActivitiesRepo.update.mockResolvedValue({ ...existingActivity, isDone: true });

      await service.markDone(tenantId, 'act-1', {} as any, auditContext);

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when activity is already done', async () => {
      mockActivitiesRepo.findById.mockResolvedValue({ ...existingActivity, isDone: true });

      await expect(service.markDone(tenantId, 'act-1', {} as any, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rollback transaction on error', async () => {
      mockActivitiesRepo.update.mockRejectedValue(new Error('DB error'));

      await expect(service.markDone(tenantId, 'act-1', {} as any, auditContext)).rejects.toThrow(
        'DB error',
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete activity', async () => {
      const existing = { id: 'act-1', model: 'leads' };
      mockActivitiesRepo.findById.mockResolvedValue(existing);

      await service.remove(tenantId, 'act-1', auditContext);

      expect(mockActivitiesRepo.softDelete).toHaveBeenCalledWith('act-1', {
        auditContext,
        tenantId,
      });
    });

    it('should log audit delete event', async () => {
      const existing = { id: 'act-1', model: 'leads' };
      mockActivitiesRepo.findById.mockResolvedValue(existing);

      await service.remove(tenantId, 'act-1', auditContext);

      expect(mockAuditService.logDelete).toHaveBeenCalledWith(
        tenantId,
        'activities',
        'act-1',
        expect.any(Object),
        'user-001',
      );
    });
  });
});
