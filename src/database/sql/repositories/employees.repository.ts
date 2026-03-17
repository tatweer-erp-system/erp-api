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
      ? `AND (e."nameEn" ILIKE :search OR e."nameAr" ILIKE :search OR e."employeeNumber" ILIKE :search OR e."employeeCode" ILIKE :search)`
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
      nameEn: string;
      nameAr: string;
      employeeCode?: string | null;
      departmentId: string;
      jobPositionId?: string | null;
      branchId?: string | null;
      employmentType?: string;
      hireDate: string;
      employeeNumber?: string | null;
      managerId?: string | null;
      nationalId?: string | null;
      birthDate?: string | null;
      gender?: string | null;
      maritalStatus?: string | null;
      nationality?: string | null;
      isSaudi?: boolean;
      emergencyContact?: string | null;
      emergencyPhone?: string | null;
      bankAccount?: string | null;
      bankName?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO employees (
        id, "tenantId", "userId", "nameEn", "nameAr", "employeeCode",
        "departmentId", "jobPositionId", "branchId", "employmentType",
        "hireDate", "employeeNumber", "managerId", "nationalId",
        "birthDate", gender, "maritalStatus", nationality, "isSaudi",
        "emergencyContact", "emergencyPhone", "bankAccount", "bankName",
        "isActive", "createdBy", "updatedBy", "createdAt", "updatedAt"
      ) VALUES (
        :id, :tenantId, :userId, :nameEn, :nameAr, :employeeCode,
        :departmentId, :jobPositionId, :branchId, :employmentType,
        :hireDate, :employeeNumber, :managerId, :nationalId,
        :birthDate, :gender, :maritalStatus, :nationality, :isSaudi,
        :emergencyContact, :emergencyPhone, :bankAccount, :bankName,
        true, :createdBy, :createdBy, NOW(), NOW()
      )`,
      {
        replacements: {
          id,
          tenantId,
          userId: data.userId,
          nameEn: data.nameEn,
          nameAr: data.nameAr,
          employeeCode: data.employeeCode ?? null,
          departmentId: data.departmentId,
          jobPositionId: data.jobPositionId ?? null,
          branchId: data.branchId ?? null,
          employmentType: data.employmentType ?? 'full-time',
          hireDate: data.hireDate,
          employeeNumber: data.employeeNumber ?? null,
          managerId: data.managerId ?? null,
          nationalId: data.nationalId ?? null,
          birthDate: data.birthDate ?? null,
          gender: data.gender ?? null,
          maritalStatus: data.maritalStatus ?? null,
          nationality: data.nationality ?? null,
          isSaudi: data.isSaudi ?? true,
          emergencyContact: data.emergencyContact ?? null,
          emergencyPhone: data.emergencyPhone ?? null,
          bankAccount: data.bankAccount ?? null,
          bankName: data.bankName ?? null,
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
      ? `AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search OR "employeeNumber" ILIKE :search OR "employeeCode" ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, "nameEn", "nameAr", "employeeNumber", "employeeCode" FROM employees WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "employeeNumber" LIMIT :limit`,
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
      ? `AND (e."nameEn" ILIKE :search OR e."nameAr" ILIKE :search OR e."employeeNumber" ILIKE :search)`
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
