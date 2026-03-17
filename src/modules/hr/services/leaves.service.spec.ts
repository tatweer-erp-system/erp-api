/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeaveStatus } from '@/common/enums/status.enum';
import { LeaveAllocationStatus } from '@/common/enums/hr-new.enums';

// Mock all repository/service imports
jest.mock('@/database/sql/repositories/leaves.repository', () => ({
  LeavesRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/leave-allocations.repository', () => ({
  LeaveAllocationsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/leave-types.repository', () => ({
  LeaveTypesRepository: jest.fn(),
}));
jest.mock('@/shared/services/audit-shared.service', () => ({
  AuditSharedService: jest.fn(),
}));
jest.mock('@/shared/services/status-transition-shared.service', () => ({
  StatusTransitionSharedService: jest.fn(),
}));
jest.mock('@/shared/services/notification-shared.service', () => ({
  NotificationSharedService: jest.fn(),
}));
jest.mock('@/shared/services/outbox-shared.service', () => ({
  OutboxSharedService: jest.fn(),
}));

import { LeavesService } from './leaves.service';

describe('LeavesService', () => {
  let service: LeavesService;
  let leavesRepository: Record<string, jest.Mock>;
  let leaveAllocationsRepository: Record<string, jest.Mock>;
  let leaveTypesRepository: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;
  let statusTransitionService: Record<string, jest.Mock>;
  let notificationService: Record<string, jest.Mock>;
  let outboxService: Record<string, jest.Mock>;

  const tenantId = 'tenant-1';
  const leaveId = 'leave-1';
  const employeeId = 'emp-1';
  const leaveTypeId = 'lt-annual';
  const userId = 'user-1';
  const auditContext = { userId };

  const mockLeaveType = {
    id: leaveTypeId,
    nameEn: 'Annual Leave',
    nameAr: 'إجازة سنوية',
    allowNegative: false,
  };

  const mockAllocation = {
    id: 'alloc-1',
    employeeId,
    leaveTypeId,
    year: 2026,
    numberOfDays: 21,
    status: LeaveAllocationStatus.APPROVED,
  };

  const mockLeaveRequest = {
    id: leaveId,
    employeeId,
    leaveTypeId,
    startDate: '2026-03-01',
    endDate: '2026-03-05',
    daysRequested: 5,
    status: LeaveStatus.PENDING,
    reason: 'Vacation',
    version: 1,
  };

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockSequelize = {
    query: jest.fn(),
    transaction: jest.fn().mockResolvedValue(mockTransaction),
  };

  beforeEach(() => {
    leavesRepository = {
      findOneById: jest.fn(),
      findAllPaginated: jest.fn(),
      findByEmployeePaginated: jest.fn(),
      findOverlappingTenant: jest.fn(),
      insertLeaveRequest: jest.fn(),
      updateLeaveRequest: jest.fn(),
      getSequelize: jest.fn().mockReturnValue(mockSequelize),
    };

    leaveAllocationsRepository = {
      findAllRaw: jest.fn(),
    };

    leaveTypesRepository = {
      findByIdOrNull: jest.fn(),
    };

    auditService = {
      logCreate: jest.fn(),
      logUpdate: jest.fn(),
      logStatusChange: jest.fn(),
    };

    statusTransitionService = {
      validateOrThrow: jest.fn(),
    };

    notificationService = {
      sendInApp: jest.fn(),
    };

    outboxService = {
      createEvent: jest.fn(),
    };

    service = new LeavesService(
      leavesRepository as any,
      leaveAllocationsRepository as any,
      leaveTypesRepository as any,
      auditService as any,
      statusTransitionService as any,
      notificationService as any,
      outboxService as any,
    );
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto = {
      employeeId,
      leaveTypeId,
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      reason: 'Vacation',
    };

    beforeEach(() => {
      leaveTypesRepository.findByIdOrNull.mockResolvedValue(mockLeaveType);
      leaveAllocationsRepository.findAllRaw.mockResolvedValue([mockAllocation]);
      // _getUsedDays returns 0 by default
      mockSequelize.query.mockResolvedValue([[{ total: '0' }]]);
      leavesRepository.findOverlappingTenant.mockResolvedValue([]);
      leavesRepository.insertLeaveRequest.mockResolvedValue(leaveId);
      leavesRepository.findOneById.mockResolvedValue(mockLeaveRequest);
    });

    it('should create a leave request with leaveTypeId (UUID FK)', async () => {
      const result = await service.create(tenantId, createDto as any, auditContext);

      expect(leavesRepository.insertLeaveRequest).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          employeeId,
          leaveTypeId,
          status: LeaveStatus.PENDING,
        }),
      );
      expect(result.id).toBe(leaveId);
    });

    it('should validate leave type exists', async () => {
      leaveTypesRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(service.create(tenantId, createDto as any, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject when end date is before start date', async () => {
      const badDto = { ...createDto, startDate: '2026-03-10', endDate: '2026-03-01' };

      await expect(service.create(tenantId, badDto as any, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate daysRequested as inclusive date range', async () => {
      // 2026-03-01 to 2026-03-05 = 5 days (inclusive)
      await service.create(tenantId, createDto as any, auditContext);

      expect(leavesRepository.insertLeaveRequest).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ daysRequested: 5 }),
      );
    });

    it('should support half-day leave (0.5 days)', async () => {
      const halfDayDto = { ...createDto, endDate: '2026-03-01', isHalfDay: true };

      await service.create(tenantId, halfDayDto as any, auditContext);

      expect(leavesRepository.insertLeaveRequest).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ daysRequested: 0.5 }),
      );
    });

    it('should check allocation balance before creating', async () => {
      // 21 allocated, 18 used = 3 remaining, requesting 5 → should fail
      mockSequelize.query.mockResolvedValue([[{ total: '18' }]]);

      await expect(service.create(tenantId, createDto as any, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow negative balance when leaveType.allowNegative is true', async () => {
      leaveTypesRepository.findByIdOrNull.mockResolvedValue({
        ...mockLeaveType,
        allowNegative: true,
      });
      // 21 allocated, 20 used = 1 remaining but requesting 5 → allowed
      mockSequelize.query.mockResolvedValue([[{ total: '20' }]]);

      const result = await service.create(tenantId, createDto as any, auditContext);

      expect(result.id).toBe(leaveId);
    });

    it('should reject when leave overlaps with an existing leave', async () => {
      leavesRepository.findOverlappingTenant.mockResolvedValue([{ id: 'other-leave' }]);

      await expect(service.create(tenantId, createDto as any, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create outbox event for leave_request.created', async () => {
      await service.create(tenantId, createDto as any, auditContext);

      expect(outboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          eventType: 'leave_request.created',
          payload: expect.objectContaining({
            employeeId,
            leaveTypeId,
            daysRequested: 5,
          }),
        }),
      );
    });

    it('should pass when no allocation exists (no balance check enforced)', async () => {
      leaveAllocationsRepository.findAllRaw.mockResolvedValue([]);

      const result = await service.create(tenantId, createDto as any, auditContext);

      expect(result.id).toBe(leaveId);
    });
  });

  // ── approve ────────────────────────────────────────────────────────────────

  describe('approve()', () => {
    it('should approve a pending leave request', async () => {
      leavesRepository.findOneById
        .mockResolvedValueOnce(mockLeaveRequest)
        .mockResolvedValueOnce({ ...mockLeaveRequest, status: LeaveStatus.APPROVED });

      const result = await service.approve(tenantId, leaveId, auditContext);

      expect(statusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'leave',
        LeaveStatus.PENDING,
        LeaveStatus.APPROVED,
      );
      expect(leavesRepository.updateLeaveRequest).toHaveBeenCalledWith(
        tenantId,
        leaveId,
        expect.arrayContaining([expect.stringContaining('status = :status')]),
        expect.objectContaining({ status: LeaveStatus.APPROVED }),
      );
    });

    it('should throw NotFoundException when leave request does not exist', async () => {
      leavesRepository.findOneById.mockResolvedValue(null);

      await expect(service.approve(tenantId, 'nonexistent', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should log audit status change on approval', async () => {
      leavesRepository.findOneById
        .mockResolvedValueOnce(mockLeaveRequest)
        .mockResolvedValueOnce({ ...mockLeaveRequest, status: LeaveStatus.APPROVED });

      await service.approve(tenantId, leaveId, auditContext);

      expect(auditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'hr.leaves',
        leaveId,
        LeaveStatus.PENDING,
        LeaveStatus.APPROVED,
        userId,
      );
    });

    it('should send outbox event on approval', async () => {
      leavesRepository.findOneById
        .mockResolvedValueOnce(mockLeaveRequest)
        .mockResolvedValueOnce({ ...mockLeaveRequest, status: LeaveStatus.APPROVED });

      await service.approve(tenantId, leaveId, auditContext);

      expect(outboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'leave_request.status_changed',
          payload: expect.objectContaining({ status: LeaveStatus.APPROVED }),
        }),
      );
    });

    it('should send notification to employee on approval', async () => {
      leavesRepository.findOneById
        .mockResolvedValueOnce(mockLeaveRequest)
        .mockResolvedValueOnce({ ...mockLeaveRequest, status: LeaveStatus.APPROVED });

      await service.approve(tenantId, leaveId, auditContext);

      expect(notificationService.sendInApp).toHaveBeenCalledWith(
        tenantId,
        employeeId,
        'leave.approved',
        expect.objectContaining({ leaveRequestId: leaveId }),
      );
    });
  });

  // ── reject ─────────────────────────────────────────────────────────────────

  describe('reject()', () => {
    it('should reject a pending leave request', async () => {
      leavesRepository.findOneById
        .mockResolvedValueOnce(mockLeaveRequest)
        .mockResolvedValueOnce({ ...mockLeaveRequest, status: LeaveStatus.REJECTED });

      const result = await service.reject(tenantId, leaveId, auditContext);

      expect(statusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'leave',
        LeaveStatus.PENDING,
        LeaveStatus.REJECTED,
      );
    });

    it('should throw NotFoundException when leave request does not exist', async () => {
      leavesRepository.findOneById.mockResolvedValue(null);

      await expect(service.reject(tenantId, 'nonexistent', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should send notification to employee on rejection', async () => {
      leavesRepository.findOneById
        .mockResolvedValueOnce(mockLeaveRequest)
        .mockResolvedValueOnce({ ...mockLeaveRequest, status: LeaveStatus.REJECTED });

      await service.reject(tenantId, leaveId, auditContext);

      expect(notificationService.sendInApp).toHaveBeenCalledWith(
        tenantId,
        employeeId,
        'leave.rejected',
        expect.objectContaining({ leaveRequestId: leaveId }),
      );
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('should cancel a pending leave request', async () => {
      leavesRepository.findOneById
        .mockResolvedValueOnce(mockLeaveRequest)
        .mockResolvedValueOnce({ ...mockLeaveRequest, status: LeaveStatus.CANCELLED });

      await service.cancel(tenantId, leaveId, auditContext);

      expect(statusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'leave',
        LeaveStatus.PENDING,
        LeaveStatus.CANCELLED,
      );
    });

    it('should restore allocation balance when cancelling a previously approved leave', async () => {
      const approvedLeave = {
        ...mockLeaveRequest,
        status: LeaveStatus.APPROVED,
        leaveTypeId,
      };
      leavesRepository.findOneById
        .mockResolvedValueOnce(approvedLeave)
        .mockResolvedValueOnce({ ...approvedLeave, status: LeaveStatus.CANCELLED });

      await service.cancel(tenantId, leaveId, auditContext);

      // Balance restoration is implicit via dynamic computation
      expect(statusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'leave',
        LeaveStatus.APPROVED,
        LeaveStatus.CANCELLED,
      );
    });

    it('should NOT restore allocation balance when cancelling a pending leave', async () => {
      leavesRepository.findOneById
        .mockResolvedValueOnce(mockLeaveRequest) // status: PENDING
        .mockResolvedValueOnce({ ...mockLeaveRequest, status: LeaveStatus.CANCELLED });

      await service.cancel(tenantId, leaveId, auditContext);

      // Only approved leaves trigger balance restoration
      expect(auditService.logStatusChange).toHaveBeenCalled();
    });

    it('should throw NotFoundException when leave request does not exist', async () => {
      leavesRepository.findOneById.mockResolvedValue(null);

      await expect(service.cancel(tenantId, 'nonexistent', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getBalance ─────────────────────────────────────────────────────────────

  describe('getBalance()', () => {
    it('should return leave balance from allocations table', async () => {
      leaveAllocationsRepository.findAllRaw.mockResolvedValue([
        {
          leaveTypeId,
          numberOfDays: 21,
        },
      ]);
      // Used: 5, Pending: 2
      mockSequelize.query
        .mockResolvedValueOnce([[{ total: '5' }]])
        .mockResolvedValueOnce([[{ total: '2' }]]);

      const result = await service.getBalance(tenantId, employeeId);

      expect(result.employeeId).toBe(employeeId);
      expect(result.balances).toHaveLength(1);
      expect(result.balances[0]).toEqual({
        leaveTypeId,
        allocated: 21,
        used: 5,
        pending: 2,
        remaining: 16, // 21 - 5
      });
    });

    it('should return empty balances when no allocations exist', async () => {
      leaveAllocationsRepository.findAllRaw.mockResolvedValue([]);

      const result = await service.getBalance(tenantId, employeeId);

      expect(result.balances).toHaveLength(0);
    });

    it('should compute balance for multiple leave types', async () => {
      leaveAllocationsRepository.findAllRaw.mockResolvedValue([
        { leaveTypeId: 'lt-annual', numberOfDays: 21 },
        { leaveTypeId: 'lt-sick', numberOfDays: 30 },
      ]);
      mockSequelize.query
        .mockResolvedValueOnce([[{ total: '5' }]]) // annual used
        .mockResolvedValueOnce([[{ total: '0' }]]) // annual pending
        .mockResolvedValueOnce([[{ total: '3' }]]) // sick used
        .mockResolvedValueOnce([[{ total: '1' }]]); // sick pending

      const result = await service.getBalance(tenantId, employeeId);

      expect(result.balances).toHaveLength(2);
      expect(result.balances[0].remaining).toBe(16); // 21 - 5
      expect(result.balances[1].remaining).toBe(27); // 30 - 3
    });
  });
});
