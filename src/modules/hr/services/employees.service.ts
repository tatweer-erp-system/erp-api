import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeesRepository } from '@/database/sql/repositories/employees.repository';
import { EmployeeContractsRepository } from '@/database/sql/repositories/employee-contracts.repository';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { ContractStatus, EmploymentType } from '@/common/enums/hr.enums';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly contractsRepository: EmployeeContractsRepository,
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

    // Lookup active contract for salary display (read-only computed)
    const activeContract = await this.contractsRepository.findActiveByEmployee(tenantId, id);

    return {
      ...employee,
      activeContract: activeContract
        ? {
            id: (activeContract as any).id,
            basicSalary: (activeContract as any).basicSalary,
            housingAllowance: (activeContract as any).housingAllowance,
            transportationAllowance: (activeContract as any).transportationAllowance,
            wageType: (activeContract as any).wageType,
            wage: (activeContract as any).wage,
            salaryStructureId: (activeContract as any).salaryStructureId,
            workingScheduleId: (activeContract as any).workingScheduleId,
          }
        : null,
    };
  }

  async create(tenantId: string, dto: CreateEmployeeDto, auditContext: AuditContext) {
    const { branchId, ...restDto } = dto;

    // Generate employee number via SequencesService
    const employeeNumber = await this.sequencesService.nextNumber(tenantId, 'employee', branchId);

    const id = await this.employeesRepository.insertEmployee(tenantId, {
      userId: restDto.userId,
      nameEn: restDto.nameEn,
      nameAr: restDto.nameAr,
      employeeCode: restDto.employeeCode ?? null,
      departmentId: restDto.departmentId,
      jobPositionId: restDto.jobPositionId ?? null,
      branchId: branchId ?? null,
      employmentType: restDto.employmentType ?? EmploymentType.FULL_TIME,
      hireDate: restDto.hireDate,
      employeeNumber,
      managerId: restDto.managerId ?? null,
      nationalId: restDto.nationalId ?? null,
      birthDate: restDto.birthDate ?? null,
      gender: restDto.gender ?? null,
      maritalStatus: restDto.maritalStatus ?? null,
      nationality: restDto.nationality ?? null,
      isSaudi: restDto.isSaudi ?? true,
      emergencyContact: restDto.emergencyContact ?? null,
      emergencyPhone: restDto.emergencyPhone ?? null,
      bankAccount: restDto.bankAccount ?? null,
      bankName: restDto.bankName ?? null,
      createdBy: auditContext.userId ?? null,
    });

    const employee = await this.employeesRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(
      tenantId,
      'hr.employees',
      id,
      {
        ...employee,
        nationalId: '***',
        bankAccount: '***',
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
      '"updatedAt" = NOW()',
      '"updatedBy" = :updatedBy',
      'version = version + 1',
    ];
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

    if (dto.employeeCode !== undefined) {
      updates.push('"employeeCode" = :employeeCode');
      replacements.employeeCode = dto.employeeCode;
    }

    if (dto.departmentId !== undefined) {
      updates.push('"departmentId" = :departmentId');
      replacements.departmentId = dto.departmentId;
    }

    if (dto.jobPositionId !== undefined) {
      updates.push('"jobPositionId" = :jobPositionId');
      replacements.jobPositionId = dto.jobPositionId;
    }

    if (dto.managerId !== undefined) {
      updates.push('"managerId" = :managerId');
      replacements.managerId = dto.managerId;
    }

    if (dto.hireDate !== undefined) {
      updates.push('"hireDate" = :hireDate');
      replacements.hireDate = dto.hireDate;
    }

    if (dto.employmentType !== undefined) {
      updates.push('"employmentType" = :employmentType');
      replacements.employmentType = dto.employmentType;
    }

    if (dto.nationalId !== undefined) {
      updates.push('"nationalId" = :nationalId');
      replacements.nationalId = dto.nationalId;
    }

    if (dto.birthDate !== undefined) {
      updates.push('"birthDate" = :birthDate');
      replacements.birthDate = dto.birthDate;
    }

    if (dto.gender !== undefined) {
      updates.push('gender = :gender');
      replacements.gender = dto.gender;
    }

    if (dto.maritalStatus !== undefined) {
      updates.push('"maritalStatus" = :maritalStatus');
      replacements.maritalStatus = dto.maritalStatus;
    }

    if (dto.nationality !== undefined) {
      updates.push('nationality = :nationality');
      replacements.nationality = dto.nationality;
    }

    if (dto.isSaudi !== undefined) {
      updates.push('"isSaudi" = :isSaudi');
      replacements.isSaudi = dto.isSaudi;
    }

    if (dto.emergencyContact !== undefined) {
      updates.push('"emergencyContact" = :emergencyContact');
      replacements.emergencyContact = dto.emergencyContact;
    }

    if (dto.emergencyPhone !== undefined) {
      updates.push('"emergencyPhone" = :emergencyPhone');
      replacements.emergencyPhone = dto.emergencyPhone;
    }

    if (dto.bankAccount !== undefined) {
      updates.push('"bankAccount" = :bankAccount');
      replacements.bankAccount = dto.bankAccount;
    }

    if (dto.bankName !== undefined) {
      updates.push('"bankName" = :bankName');
      replacements.bankName = dto.bankName;
    }

    await this.employeesRepository.updateEmployee(tenantId, id, updates, replacements);

    const updated = await this.employeesRepository.findOneById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'hr.employees',
      id,
      { ...before, nationalId: '***', bankAccount: '***' },
      {
        ...updated,
        nationalId: '***',
        bankAccount: '***',
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
      name: e.nameEn || e.employeeNumber || e.id,
      nameAr: e.nameAr || undefined,
      code: e.employeeNumber || e.employeeCode || undefined,
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
