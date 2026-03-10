import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { LeavesRepository } from '../../../database/repositories/leaves.repository';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from '../dto/update-leave-request.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { AuditContext } from '../../../common/interfaces/repository.interface';
import { AuditSharedService } from '../../../shared/services/audit.service';
import { StatusTransitionSharedService } from '../../../shared/services/status-transition.service';
import { NotificationSharedService } from '../../../shared/services/notification.service';
import { LeaveStatus } from '../../../common/enums/status.enum';

@Injectable()
export class LeavesService {
  private readonly logger = new Logger(LeavesService.name);

  constructor(
    private readonly leavesRepository: LeavesRepository,
    private readonly auditService: AuditSharedService,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly notificationService: NotificationSharedService,
  ) {}

  async findAll(tenantSlug: string, query: PaginationDto) {
    return this.leavesRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: [],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async findById(tenantSlug: string, id: string) {
    return this.leavesRepository.findById(id);
  }

  async create(tenantSlug: string, dto: CreateLeaveRequestDto, auditContext: AuditContext) {
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
    const overlapping = await this.leavesRepository.findOverlapping(
      dto.employeeId,
      dto.startDate,
      dto.endDate,
    );

    if (overlapping.length > 0) {
      throw new BadRequestException('Leave request overlaps with an existing leave');
    }

    const leaveRequest = await this.leavesRepository.create(
      {
        employeeId: dto.employeeId,
        leaveType: dto.leaveType,
        startDate: dto.startDate,
        endDate: dto.endDate,
        daysRequested,
        reason: dto.reason || null,
        status: LeaveStatus.PENDING,
      } as any,
      { auditContext },
    );

    await this.auditService.logCreate(
      tenantSlug,
      'hr.leaves',
      leaveRequest.id,
      leaveRequest.toJSON(),
      auditContext.userId,
    );

    return leaveRequest;
  }

  async update(
    tenantSlug: string,
    id: string,
    dto: UpdateLeaveRequestDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.leavesRepository.findById(id);

    if (existing.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave requests can be updated');
    }

    const before = existing.toJSON();
    const updateData: Record<string, unknown> = {};

    if (dto.reason !== undefined) updateData.reason = dto.reason;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate;
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate;

    // Recalculate days if dates changed
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      const start = new Date(dto.startDate || existing.startDate);
      const end = new Date(dto.endDate || existing.endDate);

      if (end < start) {
        throw new BadRequestException('End date must be after start date');
      }

      const diffTime = Math.abs(end.getTime() - start.getTime());
      updateData.daysRequested = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Check overlaps excluding current request
      const overlapping = await this.leavesRepository.findOverlapping(
        existing.employeeId,
        (dto.startDate || existing.startDate) as string,
        (dto.endDate || existing.endDate) as string,
        id,
      );

      if (overlapping.length > 0) {
        throw new BadRequestException('Updated dates overlap with an existing leave');
      }
    }

    const updated = await this.leavesRepository.update(id, updateData as any, { auditContext });

    await this.auditService.logUpdate(
      tenantSlug,
      'hr.leaves',
      id,
      before,
      updated.toJSON(),
      auditContext.userId,
    );

    return updated;
  }

  async approve(tenantSlug: string, id: string, auditContext: AuditContext) {
    const leaveRequest = await this.leavesRepository.findById(id);

    this.statusTransitionService.validateOrThrow(
      'leave',
      leaveRequest.status,
      LeaveStatus.APPROVED,
    );

    const updated = await this.leavesRepository.update(
      id,
      {
        status: LeaveStatus.APPROVED,
        approvedBy: auditContext.userId,
        approvedAt: new Date(),
      } as any,
      { auditContext },
    );

    await this.auditService.logStatusChange(
      tenantSlug,
      'hr.leaves',
      id,
      leaveRequest.status,
      LeaveStatus.APPROVED,
      auditContext.userId,
    );

    // Send notification
    try {
      await this.notificationService.sendInApp(
        tenantSlug,
        leaveRequest.employeeId,
        'leave.approved',
        {
          leaveRequestId: id,
          leaveType: leaveRequest.leaveType,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          message: 'Your leave request has been approved',
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to send approval notification for leave ${id}`, error);
    }

    return updated;
  }

  async reject(tenantSlug: string, id: string, auditContext: AuditContext) {
    const leaveRequest = await this.leavesRepository.findById(id);

    this.statusTransitionService.validateOrThrow(
      'leave',
      leaveRequest.status,
      LeaveStatus.REJECTED,
    );

    const updated = await this.leavesRepository.update(
      id,
      {
        status: LeaveStatus.REJECTED,
        approvedBy: auditContext.userId,
      } as any,
      { auditContext },
    );

    await this.auditService.logStatusChange(
      tenantSlug,
      'hr.leaves',
      id,
      leaveRequest.status,
      LeaveStatus.REJECTED,
      auditContext.userId,
    );

    // Send notification
    try {
      await this.notificationService.sendInApp(
        tenantSlug,
        leaveRequest.employeeId,
        'leave.rejected',
        {
          leaveRequestId: id,
          leaveType: leaveRequest.leaveType,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          message: 'Your leave request has been rejected',
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to send rejection notification for leave ${id}`, error);
    }

    return updated;
  }

  async cancel(tenantSlug: string, id: string, auditContext: AuditContext) {
    const leaveRequest = await this.leavesRepository.findById(id);

    this.statusTransitionService.validateOrThrow(
      'leave',
      leaveRequest.status,
      LeaveStatus.CANCELLED,
    );

    const updated = await this.leavesRepository.update(
      id,
      {
        status: LeaveStatus.CANCELLED,
      } as any,
      { auditContext },
    );

    await this.auditService.logStatusChange(
      tenantSlug,
      'hr.leaves',
      id,
      leaveRequest.status,
      LeaveStatus.CANCELLED,
      auditContext.userId,
    );

    return updated;
  }

  async getByEmployee(tenantSlug: string, employeeId: string, query: PaginationDto) {
    return this.leavesRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: [],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      where: { employeeId },
    });
  }

  async getBalance(tenantSlug: string, employeeId: string) {
    const currentYear = new Date().getFullYear();
    const leaveTypes = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid'];

    const balances: Record<string, { used: number; pending: number }> = {};

    for (const type of leaveTypes) {
      const used = await this.leavesRepository.getBalance(employeeId, type, currentYear);
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
