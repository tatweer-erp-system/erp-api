import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
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
      throw new NotFoundException(`Project with id ${id} not found`);
    }
    return project;
  }

  async create(tenantId: string, dto: CreateProjectDto, auditContext: AuditContext) {
    const id = await this.projectsRepository.insertProject(tenantId, {
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      descriptionEn: dto.descriptionEn || null,
      descriptionAr: dto.descriptionAr || null,
      status: 'planning',
      startDate: dto.startDate || null,
      endDate: dto.endDate || null,
      budget: dto.budget || null,
      managerId: dto.managerId || null,
      createdBy: auditContext.userId,
    });

    const project = await this.projectsRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(tenantId, 'projects', id, project, auditContext.userId);

    return project;
  }

  async update(tenantId: string, id: string, dto: UpdateProjectDto, auditContext: AuditContext) {
    const existing = await this.projectsRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }
    // Optimistic locking check
    if (dto.version !== undefined && existing.version !== dto.version) {
      throw new ConflictException('Record was modified by another user');
    }

    const before = { ...existing };

    const updates: string[] = [];
    const replacements: Record<string, unknown> = { id };

    if (dto.nameEn !== undefined) {
      updates.push('"nameEn" = :nameEn');
      replacements.nameEn = dto.nameEn;
    }
    if (dto.nameAr !== undefined) {
      updates.push('"nameAr" = :nameAr');
      replacements.nameAr = dto.nameAr;
    }
    if (dto.descriptionEn !== undefined) {
      updates.push('"descriptionEn" = :descriptionEn');
      replacements.descriptionEn = dto.descriptionEn;
    }
    if (dto.descriptionAr !== undefined) {
      updates.push('"descriptionAr" = :descriptionAr');
      replacements.descriptionAr = dto.descriptionAr;
    }
    if (dto.managerId !== undefined) {
      updates.push('"managerId" = :managerId');
      replacements.managerId = dto.managerId;
    }
    if (dto.startDate !== undefined) {
      updates.push('"startDate" = :startDate');
      replacements.startDate = dto.startDate;
    }
    if (dto.endDate !== undefined) {
      updates.push('"endDate" = :endDate');
      replacements.endDate = dto.endDate;
    }
    if (dto.budget !== undefined) {
      updates.push('budget = :budget');
      replacements.budget = dto.budget;
    }

    updates.push('"updatedBy" = :updatedBy');
    replacements.updatedBy = auditContext.userId;
    updates.push('"updatedAt" = NOW()');
    updates.push('version = version + 1');

    await this.projectsRepository.updateProject(tenantId, id, updates, replacements);

    const updated = await this.projectsRepository.findOneById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'projects',
      id,
      before,
      updated,
      auditContext.userId,
    );

    return updated;
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.projectsRepository.findOneById(tenantId, id);
    if (!existing) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    await this.projectsRepository.softDeleteProject(tenantId, id, auditContext.userId ?? null);

    await this.auditService.logDelete(tenantId, 'projects', id, existing, auditContext.userId);
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
    targetStatus: string,
    auditContext: AuditContext,
  ) {
    const project = await this.projectsRepository.findOneById(tenantId, id);
    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    this.statusTransitionService.validateOrThrow('project', project.status, targetStatus);

    await this.projectsRepository.updateProject(
      tenantId,
      id,
      [
        'status = :status',
        '"updatedBy" = :updatedBy',
        '"updatedAt" = NOW()',
        'version = version + 1',
      ],
      { id, status: targetStatus, updatedBy: auditContext.userId },
    );

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
    return this.changeStatus(tenantId, id, 'active', auditContext);
  }

  async hold(tenantId: string, id: string, auditContext: AuditContext) {
    return this.changeStatus(tenantId, id, 'on_hold', auditContext);
  }

  async resume(tenantId: string, id: string, auditContext: AuditContext) {
    return this.changeStatus(tenantId, id, 'active', auditContext);
  }

  async complete(tenantId: string, id: string, auditContext: AuditContext) {
    return this.changeStatus(tenantId, id, 'completed', auditContext);
  }

  async cancel(tenantId: string, id: string, auditContext: AuditContext) {
    return this.changeStatus(tenantId, id, 'cancelled', auditContext);
  }

  async getProgress(tenantId: string, id: string) {
    const project = await this.projectsRepository.findOneById(tenantId, id);
    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
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
