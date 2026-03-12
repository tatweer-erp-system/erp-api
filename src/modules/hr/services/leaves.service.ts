import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { LeavesRepository } from '@/database/sql/repositories/leaves.repository';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from '../dto/update-leave-request.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { NotificationSharedService } from '@/shared/services/notification-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { LeaveStatus } from '@/common/enums/status.enum';

@Injectable()
export class LeavesService {
  private readonly logger = new Logger(LeavesService.name);

  constructor(
    private readonly leavesRepository: LeavesRepository,
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
    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Calculate days requested (inclusive)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const daysRequested = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

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
      leaveType: dto.leaveType,
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
            managerId: leaveRequest?.manager_id ?? null,
            leaveType: dto.leaveType,
            fromDate: dto.startDate,
            toDate: dto.endDate,
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
      'updated_at = NOW()',
      'updated_by = :updatedBy',
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
      updates.push('start_date = :startDate');
      replacements.startDate = dto.startDate;
    }

    if (dto.endDate !== undefined) {
      updates.push('end_date = :endDate');
      replacements.endDate = dto.endDate;
    }

    // Recalculate days if dates changed
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      const start = new Date(dto.startDate || existing.start_date);
      const end = new Date(dto.endDate || existing.end_date);

      if (end < start) {
        throw new BadRequestException('End date must be after start date');
      }

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const newDaysRequested = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      updates.push('days_requested = :daysRequested');
      replacements.daysRequested = newDaysRequested;

      // Check overlaps excluding current request
      const overlapping = await this.leavesRepository.findOverlappingTenant(
        tenantId,
        existing.employee_id,
        (dto.startDate || existing.start_date) as string,
        (dto.endDate || existing.end_date) as string,
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

    const updates: string[] = [
      'updated_at = NOW()',
      'updated_by = :updatedBy',
      'status = :status',
      'approved_by = :approvedBy',
      'approved_at = NOW()',
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
        leaveRequest.employee_id,
        'leave.approved',
        {
          leaveRequestId: id,
          leaveType: leaveRequest.leave_type,
          startDate: leaveRequest.start_date,
          endDate: leaveRequest.end_date,
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
            employeeId: leaveRequest.employee_id,
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
      'updated_at = NOW()',
      'updated_by = :updatedBy',
      'status = :status',
      'approved_by = :approvedBy',
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
        leaveRequest.employee_id,
        'leave.rejected',
        {
          leaveRequestId: id,
          leaveType: leaveRequest.leave_type,
          startDate: leaveRequest.start_date,
          endDate: leaveRequest.end_date,
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
            employeeId: leaveRequest.employee_id,
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

    const updates: string[] = [
      'updated_at = NOW()',
      'updated_by = :updatedBy',
      'status = :status',
      'version = version + 1',
    ];
    const replacements: Record<string, unknown> = {
      id,
      updatedBy: auditContext.userId ?? null,
      status: LeaveStatus.CANCELLED,
    };

    await this.leavesRepository.updateLeaveRequest(tenantId, id, updates, replacements);

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
    const leaveTypes = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid'];

    const balances: Record<string, { used: number; pending: number }> = {};

    for (const type of leaveTypes) {
      const used = await this.leavesRepository.getBalanceTenant(
        tenantId,
        employeeId,
        type,
        currentYear,
      );
      balances[type] = {
        used,
        pending: 0,
      };
    }

    return {
      employeeId,
      year: currentYear,
      balances,
    };
  }
}
