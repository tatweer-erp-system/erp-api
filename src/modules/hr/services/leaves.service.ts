import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { LeavesRepository } from '@/database/sql/repositories/leaves.repository';
import { LeaveAllocationsRepository } from '@/database/sql/repositories/leave-allocations.repository';
import { LeaveTypesRepository } from '@/database/sql/repositories/leave-types.repository';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from '../dto/update-leave-request.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { NotificationSharedService } from '@/shared/services/notification-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { LeaveStatus } from '@/common/enums/status.enum';
import { LeaveAllocationStatus } from '@/common/enums/hr-new.enums';

@Injectable()
export class LeavesService {
  private readonly logger = new Logger(LeavesService.name);

  constructor(
    private readonly leavesRepository: LeavesRepository,
    private readonly leaveAllocationsRepository: LeaveAllocationsRepository,
    private readonly leaveTypesRepository: LeaveTypesRepository,
    private readonly auditService: AuditSharedService,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly notificationService: NotificationSharedService,
    private readonly outboxService: OutboxSharedService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = query;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.leavesRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search,
      sortOrder,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const leaveRequest = await this.leavesRepository.findOneById(tenantId, id);
    if (!leaveRequest) throw new NotFoundException('Leave request not found');
    return leaveRequest;
  }

  async create(tenantId: string, dto: CreateLeaveRequestDto, auditContext: AuditContext) {
    // Validate leave type exists
    const leaveType = await this.leaveTypesRepository.findByIdOrNull(dto.leaveTypeId, {
      tenantId,
    });
    if (!leaveType) {
      throw new BadRequestException(`Leave type with ID '${dto.leaveTypeId}' not found`);
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Calculate days requested (inclusive), support half-day
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    let daysRequested = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (dto.isHalfDay) {
      daysRequested = 0.5;
    }

    // Check leave allocation balance before creating
    const currentYear = startDate.getFullYear();
    const allocation = await this._getApprovedAllocation(
      tenantId,
      dto.employeeId,
      dto.leaveTypeId,
      currentYear,
    );

    if (allocation) {
      const usedDays = await this._getUsedDays(
        tenantId,
        dto.employeeId,
        dto.leaveTypeId,
        currentYear,
      );
      const remaining = Number(allocation.numberOfDays) - usedDays;

      const allowNegative = (leaveType as any).allowNegative ?? false;
      if (!allowNegative && daysRequested > remaining) {
        throw new BadRequestException(
          `Insufficient leave balance. Available: ${remaining} days, Requested: ${daysRequested} days`,
        );
      }
    }

    // Check for overlapping leaves
    const overlapping = await this.leavesRepository.findOverlappingTenant(
      tenantId,
      dto.employeeId,
      dto.startDate,
      dto.endDate,
    );

    if (overlapping.length > 0) {
      throw new BadRequestException('Leave request overlaps with an existing leave');
    }

    const id = await this.leavesRepository.insertLeaveRequest(tenantId, {
      employeeId: dto.employeeId,
      leaveTypeId: dto.leaveTypeId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      daysRequested,
      reason: dto.reason || null,
      status: LeaveStatus.PENDING,
      createdBy: auditContext.userId ?? null,
    });

    const leaveRequest = await this.leavesRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(tenantId, 'hr.leaves', id, leaveRequest, auditContext.userId);

    // Create outbox event for cross-module effects
    try {
      const sequelize = this.leavesRepository.getSequelize();
      const transaction = await sequelize.transaction();
      try {
        await this.outboxService.createEvent({
          tenantId,
          eventType: 'leave_request.created',
          payload: {
            employeeId: dto.employeeId,
            leaveTypeId: dto.leaveTypeId,
            fromDate: dto.startDate,
            toDate: dto.endDate,
            daysRequested,
            reason: dto.reason ?? null,
          },
          transaction,
        });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        this.logger.warn(`Failed to create outbox event for leave request ${id}`, error);
      }
    } catch (error) {
      this.logger.warn(`Failed to create outbox event for leave request ${id}`, error);
    }

    return leaveRequest;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateLeaveRequestDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.leavesRepository.findOneById(tenantId, id);
    if (!existing) throw new NotFoundException('Leave request not found');

    if (existing.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave requests can be updated');
    }

    // Optimistic locking check
    if (existing.version !== dto.version) {
      throw new ConflictException('Record was modified by another user');
    }

    const before = { ...existing };

    const updates: string[] = [
      '"updatedAt" = NOW()',
      '"updatedBy" = :updatedBy',
      'version = version + 1',
    ];
    const replacements: Record<string, unknown> = {
      id,
      updatedBy: auditContext.userId ?? null,
    };

    if (dto.reason !== undefined) {
      updates.push('reason = :reason');
      replacements.reason = dto.reason;
    }

    if (dto.startDate !== undefined) {
      updates.push('"startDate" = :startDate');
      replacements.startDate = dto.startDate;
    }

    if (dto.endDate !== undefined) {
      updates.push('"endDate" = :endDate');
      replacements.endDate = dto.endDate;
    }

    // Recalculate days if dates changed
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      const start = new Date(dto.startDate || existing.startDate);
      const end = new Date(dto.endDate || existing.endDate);

      if (end < start) {
        throw new BadRequestException('End date must be after start date');
      }

      let newDaysRequested: number;
      if (dto.isHalfDay) {
        newDaysRequested = 0.5;
      } else {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        newDaysRequested = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
      updates.push('"daysRequested" = :daysRequested');
      replacements.daysRequested = newDaysRequested;

      // Check overlaps excluding current request
      const overlapping = await this.leavesRepository.findOverlappingTenant(
        tenantId,
        existing.employeeId,
        (dto.startDate || existing.startDate) as string,
        (dto.endDate || existing.endDate) as string,
        id,
      );

      if (overlapping.length > 0) {
        throw new BadRequestException('Updated dates overlap with an existing leave');
      }
    }

    await this.leavesRepository.updateLeaveRequest(tenantId, id, updates, replacements);

    const updated = await this.leavesRepository.findOneById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'hr.leaves',
      id,
      before,
      updated,
      auditContext.userId,
    );

    return updated;
  }

  async approve(tenantId: string, id: string, auditContext: AuditContext) {
    const leaveRequest = await this.leavesRepository.findOneById(tenantId, id);
    if (!leaveRequest) throw new NotFoundException('Leave request not found');

    this.statusTransitionService.validateOrThrow(
      'leave',
      leaveRequest.status,
      LeaveStatus.APPROVED,
    );

    // Deduct from allocation balance when approved
    const startDate = new Date(leaveRequest.startDate);
    const currentYear = startDate.getFullYear();
    const leaveTypeId = leaveRequest.leaveTypeId ?? leaveRequest.leaveType;

    if (leaveTypeId) {
      await this._deductAllocationBalance(
        tenantId,
        leaveRequest.employeeId,
        leaveTypeId,
        currentYear,
        Number(leaveRequest.daysRequested),
      );
    }

    const updates: string[] = [
      '"updatedAt" = NOW()',
      '"updatedBy" = :updatedBy',
      'status = :status',
      '"approvedBy" = :approvedBy',
      '"approvedAt" = NOW()',
      'version = version + 1',
    ];
    const replacements: Record<string, unknown> = {
      id,
      updatedBy: auditContext.userId ?? null,
      status: LeaveStatus.APPROVED,
      approvedBy: auditContext.userId,
    };

    await this.leavesRepository.updateLeaveRequest(tenantId, id, updates, replacements);

    await this.auditService.logStatusChange(
      tenantId,
      'hr.leaves',
      id,
      leaveRequest.status,
      LeaveStatus.APPROVED,
      auditContext.userId,
    );

    // Send notification
    try {
      await this.notificationService.sendInApp(
        tenantId,
        leaveRequest.employeeId,
        'leave.approved',
        {
          leaveRequestId: id,
          leaveTypeId,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          message: 'Your leave request has been approved',
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to send approval notification for leave ${id}`, error);
    }

    // Create outbox event for status change
    try {
      const sequelize = this.leavesRepository.getSequelize();
      const transaction = await sequelize.transaction();
      try {
        await this.outboxService.createEvent({
          tenantId,
          eventType: 'leave_request.status_changed',
          payload: {
            employeeId: leaveRequest.employeeId,
            status: LeaveStatus.APPROVED,
            approverName: auditContext.userId,
          },
          transaction,
        });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        this.logger.warn(`Failed to create outbox event for leave approval ${id}`, error);
      }
    } catch (error) {
      this.logger.warn(`Failed to create outbox event for leave approval ${id}`, error);
    }

    return this.leavesRepository.findOneById(tenantId, id);
  }

  async reject(tenantId: string, id: string, auditContext: AuditContext) {
    const leaveRequest = await this.leavesRepository.findOneById(tenantId, id);
    if (!leaveRequest) throw new NotFoundException('Leave request not found');

    this.statusTransitionService.validateOrThrow(
      'leave',
      leaveRequest.status,
      LeaveStatus.REJECTED,
    );

    const updates: string[] = [
      '"updatedAt" = NOW()',
      '"updatedBy" = :updatedBy',
      'status = :status',
      '"approvedBy" = :approvedBy',
      'version = version + 1',
    ];
    const replacements: Record<string, unknown> = {
      id,
      updatedBy: auditContext.userId ?? null,
      status: LeaveStatus.REJECTED,
      approvedBy: auditContext.userId,
    };

    await this.leavesRepository.updateLeaveRequest(tenantId, id, updates, replacements);

    await this.auditService.logStatusChange(
      tenantId,
      'hr.leaves',
      id,
      leaveRequest.status,
      LeaveStatus.REJECTED,
      auditContext.userId,
    );

    // Send notification
    try {
      await this.notificationService.sendInApp(
        tenantId,
        leaveRequest.employeeId,
        'leave.rejected',
        {
          leaveRequestId: id,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          message: 'Your leave request has been rejected',
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to send rejection notification for leave ${id}`, error);
    }

    // Create outbox event for status change
    try {
      const sequelize = this.leavesRepository.getSequelize();
      const transaction = await sequelize.transaction();
      try {
        await this.outboxService.createEvent({
          tenantId,
          eventType: 'leave_request.status_changed',
          payload: {
            employeeId: leaveRequest.employeeId,
            status: LeaveStatus.REJECTED,
            approverName: auditContext.userId,
          },
          transaction,
        });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        this.logger.warn(`Failed to create outbox event for leave rejection ${id}`, error);
      }
    } catch (error) {
      this.logger.warn(`Failed to create outbox event for leave rejection ${id}`, error);
    }

    return this.leavesRepository.findOneById(tenantId, id);
  }

  async cancel(tenantId: string, id: string, auditContext: AuditContext) {
    const leaveRequest = await this.leavesRepository.findOneById(tenantId, id);
    if (!leaveRequest) throw new NotFoundException('Leave request not found');

    this.statusTransitionService.validateOrThrow(
      'leave',
      leaveRequest.status,
      LeaveStatus.CANCELLED,
    );

    const wasApproved = leaveRequest.status === LeaveStatus.APPROVED;

    const updates: string[] = [
      '"updatedAt" = NOW()',
      '"updatedBy" = :updatedBy',
      'status = :status',
      'version = version + 1',
    ];
    const replacements: Record<string, unknown> = {
      id,
      updatedBy: auditContext.userId ?? null,
      status: LeaveStatus.CANCELLED,
    };

    await this.leavesRepository.updateLeaveRequest(tenantId, id, updates, replacements);

    // Restore allocation balance if leave was previously approved
    if (wasApproved) {
      const startDate = new Date(leaveRequest.startDate);
      const currentYear = startDate.getFullYear();
      const leaveTypeId = leaveRequest.leaveTypeId ?? leaveRequest.leaveType;

      if (leaveTypeId) {
        await this._restoreAllocationBalance(
          tenantId,
          leaveRequest.employeeId,
          leaveTypeId,
          currentYear,
          Number(leaveRequest.daysRequested),
        );
      }
    }

    await this.auditService.logStatusChange(
      tenantId,
      'hr.leaves',
      id,
      leaveRequest.status,
      LeaveStatus.CANCELLED,
      auditContext.userId,
    );

    return this.leavesRepository.findOneById(tenantId, id);
  }

  async getByEmployee(tenantId: string, employeeId: string, query: PaginationDto) {
    const { limit = 20, page = 1, sortOrder = 'DESC' } = query;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.leavesRepository.findByEmployeePaginated(
      tenantId,
      employeeId,
      { limit, offset, sortOrder },
    );

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBalance(tenantId: string, employeeId: string) {
    const currentYear = new Date().getFullYear();

    // Get all approved allocations for this employee
    const allocations = await this.leaveAllocationsRepository.findAllRaw({
      where: {
        employeeId,
        year: currentYear,
        status: LeaveAllocationStatus.APPROVED,
      },
      tenantId,
    });

    const balances: Array<{
      leaveTypeId: string;
      allocated: number;
      used: number;
      pending: number;
      remaining: number;
    }> = [];

    for (const alloc of allocations) {
      const a = alloc as any;
      const usedDays = await this._getUsedDays(tenantId, employeeId, a.leaveTypeId, currentYear);
      const pendingDays = await this._getPendingDays(
        tenantId,
        employeeId,
        a.leaveTypeId,
        currentYear,
      );

      balances.push({
        leaveTypeId: a.leaveTypeId,
        allocated: Number(a.numberOfDays),
        used: usedDays,
        pending: pendingDays,
        remaining: Number(a.numberOfDays) - usedDays,
      });
    }

    return {
      employeeId,
      year: currentYear,
      balances,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async _getApprovedAllocation(
    tenantId: string,
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ) {
    const allocations = await this.leaveAllocationsRepository.findAllRaw({
      where: {
        employeeId,
        leaveTypeId,
        year,
        status: LeaveAllocationStatus.APPROVED,
      },
      tenantId,
    });
    return allocations.length > 0 ? (allocations[0] as any) : null;
  }

  private async _getUsedDays(
    tenantId: string,
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ): Promise<number> {
    const sequelize = this.leavesRepository.getSequelize();
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    const [rows] = await sequelize.query(
      `SELECT COALESCE(SUM("daysRequested"), 0) as total
       FROM leave_requests
       WHERE "employeeId" = :employeeId
         AND "leaveTypeId" = :leaveTypeId
         AND status = 'approved'
         AND "startDate" >= :startOfYear
         AND "endDate" <= :endOfYear
         AND "deletedAt" IS NULL
         AND "tenantId" = :tenantId`,
      {
        replacements: { tenantId, employeeId, leaveTypeId, startOfYear, endOfYear },
      } as any,
    );
    return parseFloat((rows as unknown as any[])[0]?.total ?? '0');
  }

  private async _getPendingDays(
    tenantId: string,
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ): Promise<number> {
    const sequelize = this.leavesRepository.getSequelize();
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    const [rows] = await sequelize.query(
      `SELECT COALESCE(SUM("daysRequested"), 0) as total
       FROM leave_requests
       WHERE "employeeId" = :employeeId
         AND "leaveTypeId" = :leaveTypeId
         AND status = 'pending'
         AND "startDate" >= :startOfYear
         AND "endDate" <= :endOfYear
         AND "deletedAt" IS NULL
         AND "tenantId" = :tenantId`,
      {
        replacements: { tenantId, employeeId, leaveTypeId, startOfYear, endOfYear },
      } as any,
    );
    return parseFloat((rows as unknown as any[])[0]?.total ?? '0');
  }

  /**
   * Deducts days from the allocation balance.
   * This is a logical deduction tracked via leave requests, not a column update.
   * The balance is always computed as: allocation.numberOfDays - SUM(approved leave days).
   */
  private async _deductAllocationBalance(
    _tenantId: string,
    _employeeId: string,
    _leaveTypeId: string,
    _year: number,
    _days: number,
  ): Promise<void> {
    // Balance is computed dynamically from approved leave requests.
    // The approval itself serves as the deduction — no separate update needed.
    // This method exists as an extension point for future allocation tracking.
    this.logger.debug(
      `Leave approved: ${_days} days deducted for employee ${_employeeId}, type ${_leaveTypeId}`,
    );
  }

  /**
   * Restores days to the allocation balance when a leave is cancelled/rejected.
   * Since balance is computed dynamically, cancelling the leave automatically restores the balance.
   */
  private async _restoreAllocationBalance(
    _tenantId: string,
    _employeeId: string,
    _leaveTypeId: string,
    _year: number,
    _days: number,
  ): Promise<void> {
    // Balance is computed dynamically from approved leave requests.
    // Cancelling the leave (setting status to cancelled) automatically restores the balance.
    this.logger.debug(
      `Leave cancelled: ${_days} days restored for employee ${_employeeId}, type ${_leaveTypeId}`,
    );
  }
}
