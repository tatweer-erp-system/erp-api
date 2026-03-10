import { Injectable, Logger } from '@nestjs/common';
import { DepartmentsRepository } from './departments.repository';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
import { AuditContext } from '../../../common/interfaces/repository.interface';
import { SharedAuditService } from '../../../shared/services/audit.service';
import { Employee } from '../../../database/entities/employee.entity';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(
    private readonly departmentsRepository: DepartmentsRepository,
    private readonly auditService: SharedAuditService,
  ) {}

  async findAll(tenantSlug: string, query: PaginationDto) {
    return this.departmentsRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['name'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async findById(tenantSlug: string, id: string) {
    return this.departmentsRepository.findById(id);
  }

  async create(tenantSlug: string, dto: CreateDepartmentDto, auditContext: AuditContext) {
    const department = await this.departmentsRepository.create(
      {
        name: { en: dto.name_en, ar: dto.name_ar },
        description:
          dto.description_en || dto.description_ar
            ? { en: dto.description_en || '', ar: dto.description_ar || '' }
            : null,
        parentId: dto.parentId || null,
        managerId: dto.managerId || null,
      } as any,
      { auditContext },
    );

    await this.auditService.logCreate(
      tenantSlug,
      'hr.departments',
      department.id,
      department.toJSON(),
      auditContext.userId,
    );

    return department;
  }

  async update(
    tenantSlug: string,
    id: string,
    dto: UpdateDepartmentDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.departmentsRepository.findById(id);
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

    if (dto.parentId !== undefined) updateData.parentId = dto.parentId;
    if (dto.managerId !== undefined) updateData.managerId = dto.managerId;

    const updated = await this.departmentsRepository.update(id, updateData as any, {
      auditContext,
    });

    await this.auditService.logUpdate(
      tenantSlug,
      'hr.departments',
      id,
      before,
      updated.toJSON(),
      auditContext.userId,
    );

    return updated;
  }

  async remove(tenantSlug: string, id: string, auditContext: AuditContext) {
    const existing = await this.departmentsRepository.findById(id);

    await this.departmentsRepository.softDelete(id, { auditContext });

    await this.auditService.logDelete(
      tenantSlug,
      'hr.departments',
      id,
      existing.toJSON(),
      auditContext.userId,
    );
  }

  async getDropdown(tenantSlug: string, query: DropdownQueryDto) {
    const departments = await this.departmentsRepository.findAllRaw({
      where: {},
      attributes: ['id', 'name'],
    });

    let results = departments.map((d) => ({
      id: d.id,
      name: d.name,
    }));

    if (query.search) {
      const search = query.search.toLowerCase();
      results = results.filter(
        (d) => d.name.en.toLowerCase().includes(search) || d.name.ar.toLowerCase().includes(search),
      );
    }

    return results.slice(0, query.limit || 100);
  }

  async getEmployeeCount(tenantSlug: string, departmentId: string): Promise<number> {
    // Use raw count on Employee model filtered by departmentId
    return Employee.count({
      where: { departmentId },
    });
  }
}
