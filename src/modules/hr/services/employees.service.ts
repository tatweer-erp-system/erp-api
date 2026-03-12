import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeesRepository } from '@/database/sql/repositories/employees.repository';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly auditService: AuditSharedService,
    private readonly outboxService: OutboxSharedService,
    private readonly sequencesService: SequencesService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = query;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.employeesRepository.findAllPaginated(tenantId, {
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
    const employee = await this.employeesRepository.findOneById(tenantId, id);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async create(tenantId: string, dto: CreateEmployeeDto, auditContext: AuditContext) {
    // Strip employeeNumber from request — auto-generated via sequences
    const { branchId, ...restDto } = dto;

    // Generate employee number via SequencesService
    const employeeNumber = await this.sequencesService.nextNumber(tenantId, 'employee', branchId);

    const id = await this.employeesRepository.insertEmployee(tenantId, {
      userId: restDto.userId,
      departmentId: restDto.departmentId,
      position: {
        en: restDto.jobTitle_en || `${restDto.firstName_en} ${restDto.lastName_en}`,
        ar: restDto.jobTitle_ar || `${restDto.firstName_ar} ${restDto.lastName_ar}`,
      },
      hireDate: restDto.hireDate,
      employeeNumber,
      managerId: restDto.managerId || null,
      nationalId: restDto.nationalId || null,
      iban: restDto.iban || null,
      bankAccountNumber: restDto.bankAccountNumber || null,
      basicSalary: restDto.basicSalary ?? null,
      createdBy: auditContext.userId ?? null,
    });

    const employee = await this.employeesRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(
      tenantId,
      'hr.employees',
      id,
      {
        ...employee,
        basicSalary: '***',
        nationalId: '***',
        iban: '***',
        bankAccountNumber: '***',
      },
      auditContext.userId,
    );

    // Create outbox event for cross-module effects
    try {
      const sequelize = this.employeesRepository.getSequelize();
      const transaction = await sequelize.transaction();
      try {
        await this.outboxService.createEvent({
          tenantId,
          eventType: 'employee.created',
          payload: {
            employeeId: id,
            employeeNumber,
            userId: restDto.userId,
            departmentId: restDto.departmentId,
            branchId: branchId ?? null,
          },
          transaction,
        });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        this.logger.warn(`Failed to create outbox event for employee ${id}`, error);
      }
    } catch (error) {
      this.logger.warn(`Failed to create outbox event for employee ${id}`, error);
    }

    return employee;
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto, auditContext: AuditContext) {
    const existing = await this.employeesRepository.findOneById(tenantId, id);
    if (!existing) throw new NotFoundException('Employee not found');

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

    if (dto.departmentId !== undefined) {
      updates.push('department_id = :departmentId');
      replacements.departmentId = dto.departmentId;
    }

    if (dto.managerId !== undefined) {
      updates.push('manager_id = :managerId');
      replacements.managerId = dto.managerId;
    }

    if (dto.hireDate !== undefined) {
      updates.push('hire_date = :hireDate');
      replacements.hireDate = dto.hireDate;
    }

    if (dto.jobTitle_en !== undefined || dto.jobTitle_ar !== undefined) {
      const currentPosition = existing.position || { en: '', ar: '' };
      const newPosition = {
        en: dto.jobTitle_en !== undefined ? dto.jobTitle_en : currentPosition.en,
        ar: dto.jobTitle_ar !== undefined ? dto.jobTitle_ar : currentPosition.ar,
      };
      updates.push('position = :position::jsonb');
      replacements.position = JSON.stringify(newPosition);
    }

    if (dto.nationalId !== undefined) {
      updates.push('national_id = :nationalId');
      replacements.nationalId = dto.nationalId;
    }

    if (dto.iban !== undefined) {
      updates.push('iban = :iban');
      replacements.iban = dto.iban;
    }

    if (dto.bankAccountNumber !== undefined) {
      updates.push('bank_account_number = :bankAccountNumber');
      replacements.bankAccountNumber = dto.bankAccountNumber;
    }

    if (dto.basicSalary !== undefined) {
      updates.push('basic_salary = :basicSalary');
      replacements.basicSalary = dto.basicSalary;
    }

    await this.employeesRepository.updateEmployee(tenantId, id, updates, replacements);

    const updated = await this.employeesRepository.findOneById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'hr.employees',
      id,
      { ...before, basicSalary: '***', nationalId: '***', iban: '***', bankAccountNumber: '***' },
      {
        ...updated,
        basicSalary: '***',
        nationalId: '***',
        iban: '***',
        bankAccountNumber: '***',
      },
      auditContext.userId,
    );

    return updated;
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.employeesRepository.findOneById(tenantId, id);
    if (!existing) throw new NotFoundException('Employee not found');

    await this.employeesRepository.softDeleteEmployee(tenantId, id, auditContext.userId ?? null);

    await this.auditService.logDelete(tenantId, 'hr.employees', id, existing, auditContext.userId);
  }

  async restore(tenantId: string, id: string, auditContext: AuditContext) {
    await this.employeesRepository.restoreEmployee(tenantId, id);

    const employee = await this.employeesRepository.findOneById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'hr.employees',
      id,
      { deletedAt: 'soft-deleted' },
      { deletedAt: null },
      auditContext.userId,
    );

    return employee;
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    const { search, limit = 100 } = query;
    const rows = await this.employeesRepository.findDropdown(tenantId, {
      search,
      limit,
    });

    return ((rows as unknown as any[]) || []).map((e: any) => ({
      id: e.id,
      name: e.position?.en || e.employee_number || e.id,
      code: e.employee_number || undefined,
    }));
  }

  async getByDepartment(tenantId: string, departmentId: string, query: PaginationDto) {
    const { limit = 20, search, page = 1, sortOrder = 'DESC' } = query;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.employeesRepository.findByDepartmentPaginated(
      tenantId,
      departmentId,
      { limit, offset, search, sortOrder },
    );

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
