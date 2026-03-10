import { Injectable, Logger } from '@nestjs/common';
import { ProjectsRepository } from './projects.repository';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
import { AuditContext } from '../../../common/interfaces/repository.interface';
import { SharedAuditService } from '../../../shared/services/audit.service';
import { StatusTransitionService } from '../../../shared/services/status-transition.service';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly auditService: SharedAuditService,
    private readonly statusTransitionService: StatusTransitionService,
    private readonly tenantSequelizeService: TenantSequelizeService,
  ) {}

  async findAll(tenantSlug: string, query: PaginationDto) {
    return this.projectsRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['name'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async findById(tenantSlug: string, id: string) {
    return this.projectsRepository.findById(id);
  }

  async create(tenantSlug: string, dto: CreateProjectDto, auditContext: AuditContext) {
    const project = await this.projectsRepository.create(
      {
        name: { en: dto.name_en, ar: dto.name_ar },
        description:
          dto.description_en || dto.description_ar
            ? { en: dto.description_en || '', ar: dto.description_ar || '' }
            : null,
        status: 'planning',
        startDate: dto.startDate || null,
        endDate: dto.endDate || null,
        budget: dto.budget || null,
        managerId: dto.managerId || null,
        members: [],
      } as any,
      { auditContext },
    );

    await this.auditService.logCreate(
      tenantSlug,
      'projects',
      project.id,
      project.toJSON(),
      auditContext.userId,
    );

    return project;
  }

  async update(tenantSlug: string, id: string, dto: UpdateProjectDto, auditContext: AuditContext) {
    const existing = await this.projectsRepository.findById(id);
    const before = existing.toJSON();

    const updateData: Record<string, unknown> = {};

    if (dto.name_en !== undefined || dto.name_ar !== undefined) {
      const currentName = existing.name || { en: '', ar: '' };
      updateData.name = {
        en: dto.name_en !== undefined ? dto.name_en : currentName.en,
        ar: dto.name_ar !== undefined ? dto.name_ar : currentName.ar,
      };
    }

    if (dto.description_en !== undefined || dto.description_ar !== undefined) {
      const currentDesc = existing.description || { en: '', ar: '' };
      updateData.description = {
        en: dto.description_en !== undefined ? dto.description_en : currentDesc.en,
        ar: dto.description_ar !== undefined ? dto.description_ar : currentDesc.ar,
      };
    }

    if (dto.managerId !== undefined) updateData.managerId = dto.managerId;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate;
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate;
    if (dto.budget !== undefined) updateData.budget = dto.budget;

    const updated = await this.projectsRepository.update(id, updateData as any, { auditContext });

    await this.auditService.logUpdate(
      tenantSlug,
      'projects',
      id,
      before,
      updated.toJSON(),
      auditContext.userId,
    );

    return updated;
  }

  async remove(tenantSlug: string, id: string, auditContext: AuditContext) {
    const existing = await this.projectsRepository.findById(id);

    await this.projectsRepository.softDelete(id, { auditContext });

    await this.auditService.logDelete(
      tenantSlug,
      'projects',
      id,
      existing.toJSON(),
      auditContext.userId,
    );
  }

  async getDropdown(tenantSlug: string, query: DropdownQueryDto) {
    const projects = await this.projectsRepository.findAllRaw({
      where: {},
      attributes: ['id', 'name', 'status'],
    });

    let results = projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
    }));

    if (query.search) {
      const search = query.search.toLowerCase();
      results = results.filter(
        (p) => p.name.en.toLowerCase().includes(search) || p.name.ar.toLowerCase().includes(search),
      );
    }

    return results.slice(0, query.limit || 100);
  }

  async activate(tenantSlug: string, id: string, auditContext: AuditContext) {
    const project = await this.projectsRepository.findById(id);
    const targetStatus = 'active';

    this.statusTransitionService.validateOrThrow('project', project.status, targetStatus);

    await this.projectsRepository.update(id, { status: targetStatus } as any, { auditContext });

    await this.auditService.logStatusChange(
      tenantSlug,
      'projects',
      id,
      project.status,
      targetStatus,
      auditContext.userId,
    );

    return this.projectsRepository.findById(id);
  }

  async hold(tenantSlug: string, id: string, auditContext: AuditContext) {
    const project = await this.projectsRepository.findById(id);
    const targetStatus = 'on_hold';

    this.statusTransitionService.validateOrThrow('project', project.status, targetStatus);

    await this.projectsRepository.update(id, { status: targetStatus } as any, { auditContext });

    await this.auditService.logStatusChange(
      tenantSlug,
      'projects',
      id,
      project.status,
      targetStatus,
      auditContext.userId,
    );

    return this.projectsRepository.findById(id);
  }

  async resume(tenantSlug: string, id: string, auditContext: AuditContext) {
    const project = await this.projectsRepository.findById(id);
    const targetStatus = 'active';

    this.statusTransitionService.validateOrThrow('project', project.status, targetStatus);

    await this.projectsRepository.update(id, { status: targetStatus } as any, { auditContext });

    await this.auditService.logStatusChange(
      tenantSlug,
      'projects',
      id,
      project.status,
      targetStatus,
      auditContext.userId,
    );

    return this.projectsRepository.findById(id);
  }

  async complete(tenantSlug: string, id: string, auditContext: AuditContext) {
    const project = await this.projectsRepository.findById(id);
    const targetStatus = 'completed';

    this.statusTransitionService.validateOrThrow('project', project.status, targetStatus);

    await this.projectsRepository.update(id, { status: targetStatus } as any, { auditContext });

    await this.auditService.logStatusChange(
      tenantSlug,
      'projects',
      id,
      project.status,
      targetStatus,
      auditContext.userId,
    );

    return this.projectsRepository.findById(id);
  }

  async cancel(tenantSlug: string, id: string, auditContext: AuditContext) {
    const project = await this.projectsRepository.findById(id);
    const targetStatus = 'cancelled';

    this.statusTransitionService.validateOrThrow('project', project.status, targetStatus);

    await this.projectsRepository.update(id, { status: targetStatus } as any, { auditContext });

    await this.auditService.logStatusChange(
      tenantSlug,
      'projects',
      id,
      project.status,
      targetStatus,
      auditContext.userId,
    );

    return this.projectsRepository.findById(id);
  }

  async getProgress(tenantSlug: string, id: string) {
    await this.projectsRepository.findById(id); // ensure exists

    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [totalResult] = await sequelize.query(
      `SELECT COUNT(*) as count FROM tasks WHERE project_id = :projectId AND deleted_at IS NULL`,
      { replacements: { projectId: id }, type: 'SELECT' } as any,
    );
    const [doneResult] = await sequelize.query(
      `SELECT COUNT(*) as count FROM tasks WHERE project_id = :projectId AND status = 'done' AND deleted_at IS NULL`,
      { replacements: { projectId: id }, type: 'SELECT' } as any,
    );

    const total = parseInt((totalResult as any[])[0]?.count ?? '0');
    const done = parseInt((doneResult as any[])[0]?.count ?? '0');
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      projectId: id,
      totalTasks: total,
      completedTasks: done,
      progressPercentage: percentage,
    };
  }
}
