import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Employee } from '../entities/employee.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmployeesRepository extends BaseRepository<Employee> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Employee, true);
  }

  async findByEmployeeId(employeeNumber: string, tenantId: string): Promise<Employee | null> {
    return this.findOne({
      where: { employeeNumber },
      tenantId,
    });
  }

  async existsByEmployeeId(employeeNumber: string, tenantId: string): Promise<boolean> {
    return this.exists({ employeeNumber: employeeNumber }, { tenantId });
  }

  async findByDepartment(departmentId: string, tenantId: string): Promise<Employee[]> {
    return this.findAllRaw({
      where: { departmentId },
      tenantId,
    });
  }

  // ── Raw SQL tenant-aware methods ──────────────────────────────────────────

  async findAllPaginated(
    tenantId: string,
    options: { limit: number; offset: number; search?: string; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder } = options;

    const whereClause = search
      ? `AND (e.position->>'en' ILIKE :search OR e.position->>'ar' ILIKE :search OR e.employeeNumber ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT e.* FROM employees e WHERE e."deletedAt" IS NULL AND e."tenantId" = :tenantId ${whereClause} ORDER BY e."createdAt" ${sortOrder === 'ASC' ? 'ASC' : 'DESC'} LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM employees e WHERE e."deletedAt" IS NULL AND e."tenantId" = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM employees WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertEmployee(
    tenantId: string,
    data: {
      userId: string;
      departmentId: string;
      position: { en: string; ar: string };
      hireDate: string;
      employeeNumber?: string | null;
      managerId?: string | null;
      nationalId?: string | null;
      iban?: string | null;
      bankAccountNumber?: string | null;
      basicSalary?: number | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO employees (id, "tenantId", "userId", "departmentId", position, "hireDate", "employeeNumber", "managerId", "nationalId", iban, "bankAccountNumber", "basicSalary", "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :userId, :departmentId, :position::jsonb, :hireDate, :employeeNumber, :managerId, :nationalId, :iban, :bankAccountNumber, :basicSalary, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          userId: data.userId,
          departmentId: data.departmentId,
          position: JSON.stringify(data.position),
          hireDate: data.hireDate,
          employeeNumber: data.employeeNumber ?? null,
          managerId: data.managerId ?? null,
          nationalId: data.nationalId ?? null,
          iban: data.iban ?? null,
          bankAccountNumber: data.bankAccountNumber ?? null,
          basicSalary: data.basicSalary ?? null,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async updateEmployee(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE employees SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
      } as any,
    );
  }

  async softDeleteEmployee(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE employees SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async restoreEmployee(tenantId: string, id: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE employees SET "deletedAt" = NULL, "updatedAt" = NOW() WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } } as any,
    );
  }

  async findDropdown(tenantId: string, options: { search?: string; limit: number }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { search, limit } = options;
    const whereClause = search
      ? `AND (position->>'en' ILIKE :search OR position->>'ar' ILIKE :search OR "employeeNumber" ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, position, "employeeNumber" FROM employees WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "employeeNumber" LIMIT :limit`,
      {
        replacements: { tenantId, limit, search: search ? `%${search}%` : '' },
      } as any,
    );
    return rows;
  }

  async existsByEmployeeNumber(tenantId: string, employeeNumber: string): Promise<boolean> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT id FROM employees WHERE "employeeNumber" = :employeeNumber AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { employeeNumber, tenantId } },
    );
    return (rows as unknown as any[]).length > 0;
  }

  getSequelize() {
    return this.tenantSequelizeService.getSharedSequelize();
  }

  async findByDepartmentPaginated(
    tenantId: string,
    departmentId: string,
    options: { limit: number; offset: number; search?: string; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder } = options;

    const whereClause = search
      ? `AND (e.position->>'en' ILIKE :search OR e.position->>'ar' ILIKE :search OR e.employeeNumber ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT e.* FROM employees e WHERE e."deletedAt" IS NULL AND e."departmentId" = :departmentId AND e."tenantId" = :tenantId ${whereClause} ORDER BY e."createdAt" ${sortOrder === 'ASC' ? 'ASC' : 'DESC'} LIMIT :limit OFFSET :offset`,
      {
        replacements: {
          tenantId,
          departmentId,
          limit,
          offset,
          search: search ? `%${search}%` : '',
        },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM employees e WHERE e."deletedAt" IS NULL AND e."departmentId" = :departmentId AND e."tenantId" = :tenantId ${whereClause}`,
      {
        replacements: { tenantId, departmentId, search: search ? `%${search}%` : '' },
      } as any,
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }
}
