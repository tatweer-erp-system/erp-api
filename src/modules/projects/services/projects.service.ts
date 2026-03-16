import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProjectsRepository } from '@/database/sql/repositories/projects.repository';
import { ProjectMembersRepository } from '@/database/sql/repositories/project-members.repository';
import { TasksRepository } from '@/database/sql/repositories/tasks.repository';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { ProjectStatus, ProjectMemberRole } from '@/common/enums/project.enums';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly projectMembersRepository: ProjectMembersRepository,
    private readonly tasksRepository: TasksRepository,
    private readonly auditService: AuditSharedService,
    private readonly statusTransitionService: StatusTransitionSharedService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.projectsRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search: query.search,
      sortOrder: query.sortOrder ?? 'DESC',
    });

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(tenantId: string, id: string) {
    const project = await this.projectsRepository.findOneById(tenantId, id);
    if (!project) {
      throw new NotFoundException(msg(ErrorMessages.PROJECT_NOT_FOUND, id));
    }
    return project;
  }

  async create(tenantId: string, dto: CreateProjectDto, auditContext: AuditContext) {
    const id = await this.projectsRepository.insertProject(tenantId, {
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      descriptionEn: dto.descriptionEn || null,
      descriptionAr: dto.descriptionAr || null,
      status: ProjectStatus.PLANNING,
      startDate: dto.startDate || null,
      endDate: dto.endDate || null,
      budget: dto.budget || null,
      managerId: dto.managerId || null,
      createdBy: auditContext.userId,
    });

    const project = await this.projectsRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(
      tenantId,
      'projects',
      id,
      project as unknown as Record<string, unknown>,
      auditContext.userId,
    );

    return project;
  }

  async update(tenantId: string, id: string, dto: UpdateProjectDto, auditContext: AuditContext) {
    const existing = await this.projectsRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.PROJECT_NOT_FOUND, id));
    }
    if (dto.version !== undefined && existing.version !== dto.version) {
      throw new ConflictException(
        msg(ErrorMessages.VERSION_CONFLICT, dto.version, existing.version),
      );
    }

    const before = { ...existing };
    const updates: Record<string, unknown> = { updatedBy: auditContext.userId };

    if (dto.nameEn !== undefined) updates.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) updates.nameAr = dto.nameAr;
    if (dto.descriptionEn !== undefined) updates.descriptionEn = dto.descriptionEn;
    if (dto.descriptionAr !== undefined) updates.descriptionAr = dto.descriptionAr;
    if (dto.managerId !== undefined) updates.managerId = dto.managerId;
    if (dto.startDate !== undefined) updates.startDate = dto.startDate;
    if (dto.endDate !== undefined) updates.endDate = dto.endDate;
    if (dto.budget !== undefined) updates.budget = dto.budget;

    await this.projectsRepository.updateProject(tenantId, id, [], updates);

    const updated = await this.projectsRepository.findOneById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'projects',
      id,
      before as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      auditContext.userId,
    );

    return updated;
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.projectsRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.PROJECT_NOT_FOUND, id));
    }

    const activeTasks = await this.tasksRepository.countActiveByProject(tenantId, id);
    if (activeTasks > 0) {
      throw new BadRequestException(msg(ErrorMessages.PROJECT_HAS_ACTIVE_TASKS, existing.nameEn));
    }

    await this.projectsRepository.softDeleteProject(tenantId, id, auditContext.userId ?? null);

    await this.auditService.logDelete(
      tenantId,
      'projects',
      id,
      existing as unknown as Record<string, unknown>,
      auditContext.userId,
    );
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    return this.projectsRepository.findDropdown(tenantId, {
      search: query.search,
      limit: query.limit || 100,
    });
  }

  private async changeStatus(
    tenantId: string,
    id: string,
    targetStatus: ProjectStatus,
    auditContext: AuditContext,
  ) {
    const project = await this.projectsRepository.findOneById(tenantId, id);
    if (!project) {
      throw new NotFoundException(msg(ErrorMessages.PROJECT_NOT_FOUND, id));
    }

    this.statusTransitionService.validateOrThrow('project', project.status, targetStatus);

    await this.projectsRepository.updateProject(tenantId, id, [], {
      status: targetStatus,
      updatedBy: auditContext.userId,
    });

    await this.auditService.logStatusChange(
      tenantId,
      'projects',
      id,
      project.status,
      targetStatus,
      auditContext.userId,
    );

    return this.projectsRepository.findOneById(tenantId, id);
  }

  async activate(tenantId: string, id: string, auditContext: AuditContext) {
    return this.changeStatus(tenantId, id, ProjectStatus.ACTIVE, auditContext);
  }

  async hold(tenantId: string, id: string, auditContext: AuditContext) {
    return this.changeStatus(tenantId, id, ProjectStatus.ON_HOLD, auditContext);
  }

  async resume(tenantId: string, id: string, auditContext: AuditContext) {
    return this.changeStatus(tenantId, id, ProjectStatus.ACTIVE, auditContext);
  }

  async complete(tenantId: string, id: string, auditContext: AuditContext) {
    const project = await this.projectsRepository.findOneById(tenantId, id);
    if (!project) {
      throw new NotFoundException(msg(ErrorMessages.PROJECT_NOT_FOUND, id));
    }

    const activeTasks = await this.tasksRepository.countActiveByProject(tenantId, id);
    if (activeTasks > 0) {
      throw new BadRequestException(
        msg(ErrorMessages.PROJECT_NOT_COMPLETABLE, String(activeTasks)),
      );
    }

    this.statusTransitionService.validateOrThrow(
      'project',
      project.status,
      ProjectStatus.COMPLETED,
    );

    await this.projectsRepository.updateProject(tenantId, id, [], {
      status: ProjectStatus.COMPLETED,
      updatedBy: auditContext.userId,
    });

    await this.auditService.logStatusChange(
      tenantId,
      'projects',
      id,
      project.status,
      ProjectStatus.COMPLETED,
      auditContext.userId,
    );

    return this.projectsRepository.findOneById(tenantId, id);
  }

  async cancel(tenantId: string, id: string, auditContext: AuditContext) {
    return this.changeStatus(tenantId, id, ProjectStatus.CANCELLED, auditContext);
  }

  async getProgress(tenantId: string, id: string) {
    const project = await this.projectsRepository.findOneById(tenantId, id);
    if (!project) {
      throw new NotFoundException(msg(ErrorMessages.PROJECT_NOT_FOUND, id));
    }

    const total = await this.tasksRepository.countByProject(tenantId, id);
    const done = await this.tasksRepository.countCompletedByProject(tenantId, id);
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      projectId: id,
      totalTasks: total,
      completedTasks: done,
      progressPercentage: percentage,
    };
  }

  async getReport(tenantId: string, id: string) {
    const project = await this.projectsRepository.findOneById(tenantId, id);
    if (!project) {
      throw new NotFoundException(msg(ErrorMessages.PROJECT_NOT_FOUND, id));
    }

    const tasksByStatus = await this.tasksRepository.countByStatusForProject(tenantId, id);
    const hoursData = await this.tasksRepository.getHoursSummaryForProject(tenantId, id);
    const overdueCount = await this.tasksRepository.countOverdueByProject(tenantId, id);
    const total = await this.tasksRepository.countByProject(tenantId, id);
    const done = await this.tasksRepository.countCompletedByProject(tenantId, id);
    const completionPercentage = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      projectId: id,
      projectName: { en: project.nameEn, ar: project.nameAr },
      status: project.status,
      tasksByStatus,
      estimatedHours: Number(hoursData.estimatedHours) || 0,
      loggedHours: Number(hoursData.loggedHours) || 0,
      overdueCount,
      totalTasks: total,
      completedTasks: done,
      completionPercentage,
    };
  }

  // ── Project Members Management ─────────────────────────────────────────────

  async getMembers(projectId: string, tenantId: string) {
    await this.findById(tenantId, projectId);
    return this.projectMembersRepository.findByProject(tenantId, projectId);
  }

  async addMember(
    projectId: string,
    tenantId: string,
    userId: string,
    role: string,
    auditContext: AuditContext,
  ) {
    await this.findById(tenantId, projectId);

    const existing = await this.projectMembersRepository.findOne(tenantId, projectId, userId);
    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }

    const member = await this.projectMembersRepository.insert(tenantId, {
      projectId,
      userId,
      role,
      createdBy: auditContext.userId,
    });

    await this.auditService.logCreate(
      tenantId,
      'projects.members',
      `${projectId}:${userId}`,
      { projectId, userId, role },
      auditContext.userId,
    );

    return member;
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    role: string,
    tenantId: string,
    auditContext: AuditContext,
  ) {
    const existing = await this.projectMembersRepository.findOne(tenantId, projectId, userId);
    if (!existing) {
      throw new NotFoundException('Project member not found');
    }

    const before = { role: existing.role };

    if (existing.role === ProjectMemberRole.MANAGER && role !== ProjectMemberRole.MANAGER) {
      const managerCount = await this.projectMembersRepository.countByRole(
        tenantId,
        projectId,
        ProjectMemberRole.MANAGER,
      );
      if (managerCount <= 1) {
        throw new BadRequestException(msg(ErrorMessages.CANNOT_REMOVE_LAST_MANAGER));
      }
    }

    await this.projectMembersRepository.updateRole(
      tenantId,
      projectId,
      userId,
      role,
      auditContext.userId,
    );

    await this.auditService.logUpdate(
      tenantId,
      'projects.members',
      `${projectId}:${userId}`,
      before,
      { role },
      auditContext.userId,
    );

    return this.projectMembersRepository.findOne(tenantId, projectId, userId);
  }

  async removeMember(
    projectId: string,
    userId: string,
    tenantId: string,
    auditContext: AuditContext,
  ) {
    const existing = await this.projectMembersRepository.findOne(tenantId, projectId, userId);
    if (!existing) {
      throw new NotFoundException('Project member not found');
    }

    if (existing.role === ProjectMemberRole.MANAGER) {
      const managerCount = await this.projectMembersRepository.countByRole(
        tenantId,
        projectId,
        ProjectMemberRole.MANAGER,
      );
      if (managerCount <= 1) {
        throw new BadRequestException(msg(ErrorMessages.CANNOT_REMOVE_LAST_MANAGER));
      }
    }

    await this.projectMembersRepository.remove(tenantId, projectId, userId);

    await this.auditService.logDelete(
      tenantId,
      'projects.members',
      `${projectId}:${userId}`,
      { projectId, userId, role: existing.role },
      auditContext.userId,
    );
  }

  async getAssignableUsers(projectId: string, tenantId: string) {
    await this.findById(tenantId, projectId);
    return this.projectMembersRepository.findAssignableUsers(tenantId);
  }
}
