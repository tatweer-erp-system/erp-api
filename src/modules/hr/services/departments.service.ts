import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DepartmentsRepository } from '@/database/sql/repositories/departments.repository';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(
    private readonly departmentsRepository: DepartmentsRepository,
    private readonly auditService: AuditSharedService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = query;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.departmentsRepository.findAllPaginated(tenantId, {
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
    const department = await this.departmentsRepository.findOneById(tenantId, id);
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  async create(tenantId: string, dto: CreateDepartmentDto, auditContext: AuditContext) {
    const name = { en: dto.name_en, ar: dto.name_ar };
    const description =
      dto.description_en || dto.description_ar
        ? { en: dto.description_en || '', ar: dto.description_ar || '' }
        : null;

    const id = await this.departmentsRepository.insertDepartment(tenantId, {
      name,
      description,
      parentId: dto.parentId || null,
      managerId: dto.managerId || null,
      createdBy: auditContext.userId ?? null,
    });

    const department = await this.departmentsRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(
      tenantId,
      'hr.departments',
      id,
      department,
      auditContext.userId,
    );

    return department;
  }

  async update(tenantId: string, id: string, dto: UpdateDepartmentDto, auditContext: AuditContext) {
    const existing = await this.departmentsRepository.findOneById(tenantId, id);
    if (!existing) throw new NotFoundException('Department not found');

    const before = { ...existing };

    const updates: string[] = ['updated_at = NOW()', 'updated_by = :updatedBy'];
    const replacements: Record<string, unknown> = {
      id,
      updatedBy: auditContext.userId ?? null,
    };

    if (dto.name_en !== undefined || dto.name_ar !== undefined) {
      const currentName = existing.name || { en: '', ar: '' };
      const newName = {
        en: dto.name_en !== undefined ? dto.name_en : currentName.en,
        ar: dto.name_ar !== undefined ? dto.name_ar : currentName.ar,
      };
      updates.push('name = :name::jsonb');
      replacements.name = JSON.stringify(newName);
    }

    if (dto.description_en !== undefined || dto.description_ar !== undefined) {
      const currentDesc = existing.description || { en: '', ar: '' };
      const newDesc = {
        en: dto.description_en !== undefined ? dto.description_en : currentDesc.en,
        ar: dto.description_ar !== undefined ? dto.description_ar : currentDesc.ar,
      };
      updates.push('description = :description::jsonb');
      replacements.description = JSON.stringify(newDesc);
    }

    if (dto.parentId !== undefined) {
      updates.push('parent_id = :parentId');
      replacements.parentId = dto.parentId;
    }

    if (dto.managerId !== undefined) {
      updates.push('manager_id = :managerId');
      replacements.managerId = dto.managerId;
    }

    await this.departmentsRepository.updateDepartment(tenantId, id, updates, replacements);

    const updated = await this.departmentsRepository.findOneById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'hr.departments',
      id,
      before,
      updated,
      auditContext.userId,
    );

    return updated;
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.departmentsRepository.findOneById(tenantId, id);
    if (!existing) throw new NotFoundException('Department not found');

    await this.departmentsRepository.softDeleteDepartment(
      tenantId,
      id,
      auditContext.userId ?? null,
    );

    await this.auditService.logDelete(
      tenantId,
      'hr.departments',
      id,
      existing,
      auditContext.userId,
    );
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    const { search, limit = 100 } = query;
    return this.departmentsRepository.findDropdown(tenantId, { search, limit });
  }

  async getEmployeeCount(tenantId: string, departmentId: string): Promise<number> {
    const sequelize = (
      this.departmentsRepository as any
    ).tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT COUNT(*) as total FROM public.employees WHERE tenant_id = :tenantId AND department_id = :departmentId AND deleted_at IS NULL`,
      { replacements: { tenantId, departmentId }, type: 'SELECT' } as any,
    );
    return parseInt((rows as unknown as any[])[0]?.total ?? '0', 10);
  }
}
