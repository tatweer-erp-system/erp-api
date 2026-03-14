import { Injectable, Logger } from '@nestjs/common';
import { TasksRepository } from '@/database/sql/repositories/tasks.repository';
import { TaskTimeEntriesRepository } from '@/database/sql/repositories/task-time-entries.repository';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TransitionTaskDto } from '../dto/transition-task.dto';
import { LogTimeDto } from '../dto/log-time.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { NotificationSharedService } from '@/shared/services/notification-shared.service';
import { TaskStatus, TaskPriority } from '@/common/enums/project.enums';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly taskTimeEntriesRepository: TaskTimeEntriesRepository,
    private readonly auditService: AuditSharedService,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly notificationService: NotificationSharedService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.tasksRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['titleEn', 'titleAr'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      tenantId,
    });
  }

  async findById(tenantId: string, id: string) {
    return this.tasksRepository.findById(id, { tenantId });
  }

  async create(tenantId: string, dto: CreateTaskDto, auditContext: AuditContext) {
    const task = await this.tasksRepository.create(
      {
        projectId: dto.projectId,
        titleEn: dto.titleEn,
        titleAr: dto.titleAr,
        descriptionEn: dto.descriptionEn || null,
        descriptionAr: dto.descriptionAr || null,
        status: TaskStatus.TODO,
        priority: dto.priority || TaskPriority.MEDIUM,
        assignedTo: dto.assigneeId || null,
        dueDate: dto.dueDate || null,
        estimatedHours: dto.estimatedHours || 0,
        parentTaskId: dto.parentTaskId || null,
      } as any,
      { auditContext, tenantId },
    );

    await this.auditService.logCreate(
      tenantId,
      'projects.tasks',
      task.id,
      task.toJSON() as unknown as Record<string, unknown>,
      auditContext.userId,
    );

    // Notify assignee
    if (dto.assigneeId) {
      await this.notificationService.sendInApp(tenantId, dto.assigneeId, 'task:assigned', {
        taskId: task.id,
        titleEn: task.titleEn,
        titleAr: task.titleAr,
      });
    }

    return task;
  }

  async update(tenantId: string, id: string, dto: UpdateTaskDto, auditContext: AuditContext) {
    const existing = await this.tasksRepository.findById(id, { tenantId });
    const before = existing.toJSON() as unknown as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};

    if (dto.titleEn !== undefined) updateData.titleEn = dto.titleEn;
    if (dto.titleAr !== undefined) updateData.titleAr = dto.titleAr;
    if (dto.descriptionEn !== undefined) updateData.descriptionEn = dto.descriptionEn;
    if (dto.descriptionAr !== undefined) updateData.descriptionAr = dto.descriptionAr;
    if (dto.assigneeId !== undefined) updateData.assignedTo = dto.assigneeId;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate;
    if (dto.estimatedHours !== undefined) updateData.estimatedHours = dto.estimatedHours;
    if (dto.parentTaskId !== undefined) updateData.parentTaskId = dto.parentTaskId;

    const updated = await this.tasksRepository.update(id, updateData as any, {
      auditContext,
      tenantId,
    });

    await this.auditService.logUpdate(
      tenantId,
      'projects.tasks',
      id,
      before,
      updated.toJSON() as unknown as Record<string, unknown>,
      auditContext.userId,
    );

    // Notify new assignee if changed
    if (dto.assigneeId && dto.assigneeId !== existing.assignedTo) {
      await this.notificationService.sendInApp(tenantId, dto.assigneeId, 'task:assigned', {
        taskId: id,
        titleEn: updated.titleEn,
        titleAr: updated.titleAr,
      });
    }

    return updated;
  }

  async transition(
    tenantId: string,
    id: string,
    dto: TransitionTaskDto,
    auditContext: AuditContext,
  ) {
    const task = await this.tasksRepository.findById(id, { tenantId });

    this.statusTransitionService.validateOrThrow('task', task.status, dto.status);

    await this.tasksRepository.update(id, { status: dto.status } as any, {
      auditContext,
      tenantId,
    });

    await this.auditService.logStatusChange(
      tenantId,
      'projects.tasks',
      id,
      task.status,
      dto.status,
      auditContext.userId,
    );

    // Notify assignee of status change
    if (task.assignedTo) {
      await this.notificationService.sendInApp(tenantId, task.assignedTo, 'task:transition', {
        taskId: id,
        from: task.status,
        to: dto.status,
      });
    }

    return this.tasksRepository.findById(id, { tenantId });
  }

  async getByProject(tenantId: string, projectId: string, query: PaginationDto) {
    return this.tasksRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['titleEn', 'titleAr'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      where: { projectId },
      tenantId,
    });
  }

  async getByAssignee(tenantId: string, assigneeId: string, query: PaginationDto) {
    return this.tasksRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['titleEn', 'titleAr'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      where: { assignedTo: assigneeId },
      tenantId,
    });
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.tasksRepository.findById(id, { tenantId });

    await this.tasksRepository.softDelete(id, { auditContext, tenantId });

    await this.auditService.logDelete(
      tenantId,
      'projects.tasks',
      id,
      existing.toJSON() as unknown as Record<string, unknown>,
      auditContext.userId,
    );
  }

  async logTime(
    tenantId: string,
    taskId: string,
    dto: LogTimeDto,
    auditContext: AuditContext,
  ) {
    // Verify the task exists
    await this.tasksRepository.findById(taskId, { tenantId });

    // Atomically increment loggedHours via raw query
    await this.tasksRepository.atomicIncrementLoggedHours(tenantId, taskId, dto.hours);

    // Create time entry record
    const entry = await this.taskTimeEntriesRepository.create(
      {
        taskId,
        userId: auditContext.userId,
        hours: dto.hours,
        description: dto.description || null,
        entryDate: dto.date,
      } as any,
      { auditContext, tenantId },
    );

    return entry;
  }

  async getOverdueTasks(tenantId: string, projectId: string) {
    return this.tasksRepository.findOverdue(tenantId, projectId);
  }
}
