import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { EmployeesRepository } from '../../../database/repositories/employees.repository';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
import { AuditContext } from '../../../common/interfaces/repository.interface';
import { AuditSharedService } from '../../../shared/services/audit.service';
import { EncryptionSharedService } from '../../../shared/services/encryption.service';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  private readonly sensitiveFields = [
    'nationalId',
    'iban',
    'bankAccountNumber',
    'basicSalary',
  ] as const;

  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly auditService: AuditSharedService,
    private readonly encryptionService: EncryptionSharedService,
  ) {}

  async findAll(tenantSlug: string, query: PaginationDto) {
    return this.employeesRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['position'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async findById(tenantSlug: string, id: string) {
    const employee = await this.employeesRepository.findById(id);
    return this.decryptSensitiveFields(employee);
  }

  async create(tenantSlug: string, dto: CreateEmployeeDto, auditContext: AuditContext) {
    // Check if employee number already exists
    if (dto.employeeId) {
      const exists = await this.employeesRepository.existsByEmployeeId(dto.employeeId);
      if (exists) {
        throw new ConflictException(`Employee with ID ${dto.employeeId} already exists`);
      }
    }

    const createData: Record<string, unknown> = {
      userId: dto.userId,
      departmentId: dto.departmentId,
      position: {
        en: dto.jobTitle_en || `${dto.firstName_en} ${dto.lastName_en}`,
        ar: dto.jobTitle_ar || `${dto.firstName_ar} ${dto.lastName_ar}`,
      },
      hireDate: dto.hireDate,
      employeeNumber: dto.employeeId,
      managerId: dto.managerId || null,
    };

    // Encrypt sensitive fields
    if (dto.nationalId) {
      createData.nationalId = this.encryptionService.encrypt(dto.nationalId);
    }
    if (dto.iban) {
      createData.iban = this.encryptionService.encrypt(dto.iban);
    }
    if (dto.bankAccountNumber) {
      createData.bankAccountNumber = this.encryptionService.encrypt(dto.bankAccountNumber);
    }
    if (dto.basicSalary !== undefined) {
      createData.basicSalary = this.encryptionService.encrypt(String(dto.basicSalary));
    }

    const employee = await this.employeesRepository.create(createData as any, { auditContext });

    await this.auditService.logCreate(
      tenantSlug,
      'hr.employees',
      employee.id,
      {
        ...employee.toJSON(),
        basicSalary: '***',
        nationalId: '***',
        iban: '***',
        bankAccountNumber: '***',
      },
      auditContext.userId,
    );

    return employee;
  }

  async update(tenantSlug: string, id: string, dto: UpdateEmployeeDto, auditContext: AuditContext) {
    const existing = await this.employeesRepository.findById(id);
    const before = existing.toJSON();

    const updateData: Record<string, unknown> = {};

    if (dto.departmentId !== undefined) updateData.departmentId = dto.departmentId;
    if (dto.managerId !== undefined) updateData.managerId = dto.managerId;
    if (dto.hireDate !== undefined) updateData.hireDate = dto.hireDate;

    if (dto.jobTitle_en !== undefined || dto.jobTitle_ar !== undefined) {
      const currentPosition = existing.position || { en: '', ar: '' };
      updateData.position = {
        en: dto.jobTitle_en !== undefined ? dto.jobTitle_en : currentPosition.en,
        ar: dto.jobTitle_ar !== undefined ? dto.jobTitle_ar : currentPosition.ar,
      };
    }

    // Re-encrypt sensitive fields if changed
    if (dto.nationalId !== undefined) {
      updateData.nationalId = this.encryptionService.encrypt(dto.nationalId);
    }
    if (dto.iban !== undefined) {
      updateData.iban = this.encryptionService.encrypt(dto.iban);
    }
    if (dto.bankAccountNumber !== undefined) {
      updateData.bankAccountNumber = this.encryptionService.encrypt(dto.bankAccountNumber);
    }
    if (dto.basicSalary !== undefined) {
      updateData.basicSalary = this.encryptionService.encrypt(String(dto.basicSalary));
    }

    const updated = await this.employeesRepository.update(id, updateData as any, { auditContext });

    await this.auditService.logUpdate(
      tenantSlug,
      'hr.employees',
      id,
      { ...before, basicSalary: '***', nationalId: '***', iban: '***', bankAccountNumber: '***' },
      {
        ...updated.toJSON(),
        basicSalary: '***',
        nationalId: '***',
        iban: '***',
        bankAccountNumber: '***',
      },
      auditContext.userId,
    );

    return updated;
  }

  async remove(tenantSlug: string, id: string, auditContext: AuditContext) {
    const existing = await this.employeesRepository.findById(id);

    await this.employeesRepository.softDelete(id, { auditContext });

    await this.auditService.logDelete(
      tenantSlug,
      'hr.employees',
      id,
      existing.toJSON(),
      auditContext.userId,
    );
  }

  async restore(tenantSlug: string, id: string, auditContext: AuditContext) {
    const employee = await this.employeesRepository.restore(id);

    await this.auditService.logUpdate(
      tenantSlug,
      'hr.employees',
      id,
      { deletedAt: 'soft-deleted' },
      { deletedAt: null },
      auditContext.userId,
    );

    return employee;
  }

  async getDropdown(tenantSlug: string, query: DropdownQueryDto) {
    const employees = await this.employeesRepository.findAllRaw({
      where: {},
      attributes: ['id', 'position', 'employeeNumber'],
    });

    let results = employees.map((e) => ({
      id: e.id,
      name: e.position?.en || e.employeeNumber || e.id,
      code: e.employeeNumber || undefined,
    }));

    if (query.search) {
      const search = query.search.toLowerCase();
      results = results.filter(
        (e) =>
          (e.name && e.name.toLowerCase().includes(search)) ||
          (e.code && e.code.toLowerCase().includes(search)),
      );
    }

    return results.slice(0, query.limit || 100);
  }

  async getByDepartment(tenantSlug: string, departmentId: string, query: PaginationDto) {
    return this.employeesRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['position'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      where: { departmentId },
    });
  }

  private decryptSensitiveFields(employee: any): any {
    const data = employee.toJSON ? employee.toJSON() : { ...employee };

    if (data.nationalId) {
      data.nationalId = this.encryptionService.decrypt(data.nationalId);
    }
    if (data.iban) {
      data.iban = this.encryptionService.decrypt(data.iban);
    }
    if (data.bankAccountNumber) {
      data.bankAccountNumber = this.encryptionService.decrypt(data.bankAccountNumber);
    }
    if (data.basicSalary && typeof data.basicSalary === 'string') {
      const decrypted = this.encryptionService.decrypt(data.basicSalary);
      data.basicSalary = parseFloat(decrypted) || data.basicSalary;
    }

    return data;
  }
}
