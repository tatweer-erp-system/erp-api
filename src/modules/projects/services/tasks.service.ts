import { Injectable, Logger } from '@nestjs/common';
import { TasksRepository } from '../../../database/repositories/tasks.repository';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TransitionTaskDto } from '../dto/transition-task.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { AuditContext } from '../../../common/interfaces/repository.interface';
import { AuditSharedService } from '../../../shared/services/audit.service';
import { StatusTransitionSharedService } from '../../../shared/services/status-transition.service';
import { NotificationSharedService } from '../../../shared/services/notification.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly auditService: AuditSharedService,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly notificationService: NotificationSharedService,
  ) {}

  async findAll(tenantSlug: string, query: PaginationDto) {
    return this.tasksRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['title'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async findById(tenantSlug: string, id: string) {
    return this.tasksRepository.findById(id);
  }

  async create(tenantSlug: string, dto: CreateTaskDto, auditContext: AuditContext) {
    const task = await this.tasksRepository.create(
      {
        projectId: dto.projectId,
        title: { en: dto.title_en, ar: dto.title_ar },
        description:
          dto.description_en || dto.description_ar
            ? { en: dto.description_en || '', ar: dto.description_ar || '' }
            : null,
        status: 'todo',
        priority: dto.priority || 'medium',
        assignedTo: dto.assigneeId || null,
        dueDate: dto.dueDate || null,
        estimatedHours: dto.estimatedHours || 0,
        parentTaskId: dto.parentTaskId || null,
      } as any,
      { auditContext },
    );

    await this.auditService.logCreate(
      tenantSlug,
      'projects.tasks',
      task.id,
      task.toJSON(),
      auditContext.userId,
    );

    // Notify assignee
    if (dto.assigneeId) {
      await this.notificationService.sendInApp(tenantSlug, dto.assigneeId, 'task:assigned', {
        taskId: task.id,
        title: task.title,
      });
    }

    return task;
  }

  async update(tenantSlug: string, id: string, dto: UpdateTaskDto, auditContext: AuditContext) {
    const existing = await this.tasksRepository.findById(id);
    const before = existing.toJSON();

    const updateData: Record<string, unknown> = {};

    if (dto.title_en !== undefined || dto.title_ar !== undefined) {
      const currentTitle = existing.title || { en: '', ar: '' };
      updateData.title = {
        en: dto.title_en !== undefined ? dto.title_en : currentTitle.en,
        ar: dto.title_ar !== undefined ? dto.title_ar : currentTitle.ar,
      };
    }

    if (dto.description_en !== undefined || dto.description_ar !== undefined) {
      const currentDesc = existing.description || { en: '', ar: '' };
      updateData.description = {
        en: dto.description_en !== undefined ? dto.description_en : currentDesc.en,
        ar: dto.description_ar !== undefined ? dto.description_ar : currentDesc.ar,
      };
    }

    if (dto.assigneeId !== undefined) updateData.assignedTo = dto.assigneeId;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate;
    if (dto.estimatedHours !== undefined) updateData.estimatedHours = dto.estimatedHours;
    if (dto.parentTaskId !== undefined) updateData.parentTaskId = dto.parentTaskId;

    const updated = await this.tasksRepository.update(id, updateData as any, { auditContext });

    await this.auditService.logUpdate(
      tenantSlug,
      'projects.tasks',
      id,
      before,
      updated.toJSON(),
      auditContext.userId,
    );

    // Notify new assignee if changed
    if (dto.assigneeId && dto.assigneeId !== existing.assignedTo) {
      await this.notificationService.sendInApp(tenantSlug, dto.assigneeId, 'task:assigned', {
        taskId: id,
        title: updated.title,
      });
    }

    return updated;
  }

  async transition(
    tenantSlug: string,
    id: string,
    dto: TransitionTaskDto,
    auditContext: AuditContext,
  ) {
    const task = await this.tasksRepository.findById(id);

    this.statusTransitionService.validateOrThrow('task', task.status, dto.status);

    await this.tasksRepository.update(id, { status: dto.status } as any, { auditContext });

    await this.auditService.logStatusChange(
      tenantSlug,
      'projects.tasks',
      id,
      task.status,
      dto.status,
      auditContext.userId,
    );

    // Notify assignee of status change
    if (task.assignedTo) {
      await this.notificationService.sendInApp(tenantSlug, task.assignedTo, 'task:transition', {
        taskId: id,
        from: task.status,
        to: dto.status,
      });
    }

    return this.tasksRepository.findById(id);
  }

  async getByProject(tenantSlug: string, projectId: string, query: PaginationDto) {
    return this.tasksRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['title'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      where: { projectId },
    });
  }

  async getByAssignee(tenantSlug: string, assigneeId: string, query: PaginationDto) {
    return this.tasksRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['title'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      where: { assignedTo: assigneeId },
    });
  }

  async remove(tenantSlug: string, id: string, auditContext: AuditContext) {
    const existing = await this.tasksRepository.findById(id);

    await this.tasksRepository.softDelete(id, { auditContext });

    await this.auditService.logDelete(
      tenantSlug,
      'projects.tasks',
      id,
      existing.toJSON(),
      auditContext.userId,
    );
  }
}
