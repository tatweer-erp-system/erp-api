import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, offset = 0 } = pagination;
    const [rows] = await sequelize.query(
      `SELECT e.*, u.first_name, u.last_name, u.email, d.name as department_name
       FROM employees e
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.deleted_at IS NULL
       ORDER BY e.created_at DESC LIMIT :limit OFFSET :offset`,
      { replacements: { limit, offset }, type: 'SELECT' } as any,
    );
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM employees WHERE deleted_at IS NULL`,
      { type: 'SELECT' } as any,
    );
    const total = parseInt((countResult as any[])[0]?.total ?? '0', 10);
    return {
      data: rows,
      meta: {
        page: pagination.page ?? 1,
        limit,
        total,
        totalPages: Math.ceil(total / (limit as number)),
      },
    };
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT e.*, u.first_name, u.last_name, u.email, u.phone
       FROM employees e LEFT JOIN users u ON u.id = e.user_id
       WHERE e.id = :id AND e.deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const emp = (rows as any[])[0];
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async create(tenantSlug: string, dto: CreateEmployeeDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO employees (id, user_id, department_id, position, employment_type, hire_date,
       basic_salary, salary_currency, employee_number, manager_id, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :userId, :departmentId, :position, :employmentType, :hireDate,
       :basicSalary, :salaryCurrency, :employeeNumber, :managerId, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          userId: dto.userId,
          departmentId: dto.departmentId ?? null,
          position: JSON.stringify(dto.position),
          employmentType: dto.employmentType ?? 'full-time',
          hireDate: dto.hireDate,
          basicSalary: dto.basicSalary ?? null,
          salaryCurrency: dto.salaryCurrency ?? 'USD',
          employeeNumber: dto.employeeNumber ?? null,
          managerId: dto.managerId ?? null,
          createdBy: createdBy ?? null,
        },
      } as any,
    );
    return this.findOne(tenantSlug, id);
  }

  async update(tenantSlug: string, id: string, dto: UpdateEmployeeDto, updatedBy?: string) {
    await this.findOne(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const updates = ['updated_at = NOW()', 'updated_by = :updatedBy'];
    const replacements: Record<string, unknown> = { id, updatedBy: updatedBy ?? null };
    if (dto.departmentId !== undefined) {
      updates.push('department_id = :departmentId');
      replacements['departmentId'] = dto.departmentId;
    }
    if (dto.position !== undefined) {
      updates.push('position = :position');
      replacements['position'] = JSON.stringify(dto.position);
    }
    if (dto.basicSalary !== undefined) {
      updates.push('basic_salary = :basicSalary');
      replacements['basicSalary'] = dto.basicSalary;
    }
    if (dto.managerId !== undefined) {
      updates.push('manager_id = :managerId');
      replacements['managerId'] = dto.managerId;
    }
    await sequelize.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = :id`, {
      replacements,
    } as any);
    return this.findOne(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string): Promise<void> {
    await this.findOne(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(`UPDATE employees SET deleted_at = NOW() WHERE id = :id`, {
      replacements: { id },
    } as any);
  }
}
