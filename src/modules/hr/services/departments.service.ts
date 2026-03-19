import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DepartmentsRepository } from '@/database/sql/repositories/departments.repository';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

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
    if (!department) throw new NotFoundException(msg(ErrorMessages.DEPARTMENT_NOT_FOUND, id));
    return department;
  }

  async create(tenantId: string, dto: CreateDepartmentDto, auditContext: AuditContext) {
    const id = await this.departmentsRepository.insertDepartment(tenantId, {
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      descriptionEn: dto.descriptionEn ?? null,
      descriptionAr: dto.descriptionAr ?? null,
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
    if (!existing) throw new NotFoundException(msg(ErrorMessages.DEPARTMENT_NOT_FOUND, id));

    const before = { ...existing };

    const updates: string[] = ['"updatedAt" = NOW()', '"updatedBy" = :updatedBy'];
    const replacements: Record<string, unknown> = {
      id,
      updatedBy: auditContext.userId ?? null,
    };

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

    if (dto.parentId !== undefined) {
      updates.push('"parentId" = :parentId');
      replacements.parentId = dto.parentId;
    }

    if (dto.managerId !== undefined) {
      updates.push('"managerId" = :managerId');
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
    if (!existing) throw new NotFoundException(msg(ErrorMessages.DEPARTMENT_NOT_FOUND, id));

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
      `SELECT COUNT(*) as total FROM public.employees WHERE "tenantId" = :tenantId AND "departmentId" = :departmentId AND "deletedAt" IS NULL`,
      { replacements: { tenantId, departmentId }, type: 'SELECT' } as any,
    );
    return parseInt((rows as unknown as any[])[0]?.total ?? '0', 10);
  }
}
