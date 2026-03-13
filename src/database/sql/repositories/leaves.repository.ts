import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { LeaveRequest } from '../entities/leave-request.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LeavesRepository extends BaseRepository<LeaveRequest> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(LeaveRequest, true);
  }

  getSequelize() {
    return this.tenantSequelizeService.getSharedSequelize();
  }

  async findByEmployee(employeeId: string, tenantId: string): Promise<LeaveRequest[]> {
    return this.findAllRaw({
      where: { employeeId },
      tenantId,
    });
  }

  async findOverlapping(
    employeeId: string,
    startDate: string,
    endDate: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<LeaveRequest[]> {
    const where: Record<string, unknown> = {
      employeeId,
      status: { [Op.notIn]: ['cancelled', 'rejected'] },
      [Op.or]: [
        {
          startDate: { [Op.between]: [startDate, endDate] },
        },
        {
          endDate: { [Op.between]: [startDate, endDate] },
        },
        {
          [Op.and]: [{ startDate: { [Op.lte]: startDate } }, { endDate: { [Op.gte]: endDate } }],
        },
      ],
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    return this.findAllRaw({ where, tenantId });
  }

  async getBalance(
    employeeId: string,
    leaveType: string,
    year: number,
    tenantId: string,
  ): Promise<number> {
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    const result = await this.model.sum('daysRequested', {
      where: {
        employeeId,
        leaveType,
        tenantId,
        status: { [Op.in]: ['approved', 'pending'] },
        startDate: { [Op.gte]: startOfYear },
        endDate: { [Op.lte]: endOfYear },
      },
    });

    return result || 0;
  }

  // ── Raw SQL tenant-aware methods ──────────────────────────────────────────

  async findAllPaginated(
    tenantId: string,
    options: { limit: number; offset: number; search?: string; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder } = options;

    const whereClause = search
      ? `AND (leave_type ILIKE :search OR status ILIKE :search OR reason ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT * FROM leave_requests WHERE deleted_at IS NULL AND tenant_id = :tenantId ${whereClause} ORDER BY created_at ${sortOrder === 'ASC' ? 'ASC' : 'DESC'} LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM leave_requests WHERE deleted_at IS NULL AND tenant_id = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM leave_requests WHERE id = :id AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertLeaveRequest(
    tenantId: string,
    data: {
      employeeId: string;
      leaveType: string;
      startDate: string;
      endDate: string;
      daysRequested: number;
      reason?: string | null;
      status: string;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO leave_requests (id, tenant_id, employee_id, leave_type, start_date, end_date, days_requested, reason, status, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :tenantId, :employeeId, :leaveType, :startDate, :endDate, :daysRequested, :reason, :status, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          employeeId: data.employeeId,
          leaveType: data.leaveType,
          startDate: data.startDate,
          endDate: data.endDate,
          daysRequested: data.daysRequested,
          reason: data.reason ?? null,
          status: data.status,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async updateLeaveRequest(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE leave_requests SET ${updates.join(', ')} WHERE id = :id AND tenant_id = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
      } as any,
    );
  }

  async findOverlappingTenant(
    tenantId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
    excludeId?: string,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const excludeClause = excludeId ? ` AND id != :excludeId` : '';

    const [rows] = await sequelize.query(
      `SELECT * FROM leave_requests
       WHERE employee_id = :employeeId
         AND deleted_at IS NULL
         AND tenant_id = :tenantId
         AND status NOT IN ('cancelled', 'rejected')
         AND (
           (start_date BETWEEN :startDate AND :endDate)
           OR (end_date BETWEEN :startDate AND :endDate)
           OR (start_date <= :startDate AND end_date >= :endDate)
         )${excludeClause}`,
      {
        replacements: {
          tenantId,
          employeeId,
          startDate,
          endDate,
          excludeId: excludeId ?? null,
        },
      } as any,
    );
    return rows as unknown as any[];
  }

  async getBalanceTenant(
    tenantId: string,
    employeeId: string,
    leaveType: string,
    year: number,
  ): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    const [rows] = await sequelize.query(
      `SELECT COALESCE(SUM(days_requested), 0) as total
       FROM leave_requests
       WHERE employee_id = :employeeId
         AND leave_type = :leaveType
         AND status IN ('approved', 'pending')
         AND start_date >= :startOfYear
         AND end_date <= :endOfYear
         AND deleted_at IS NULL
         AND tenant_id = :tenantId`,
      {
        replacements: { tenantId, employeeId, leaveType, startOfYear, endOfYear },
      } as any,
    );
    return parseInt((rows as unknown as any[])[0]?.total ?? '0', 10);
  }

  async findByEmployeePaginated(
    tenantId: string,
    employeeId: string,
    options: { limit: number; offset: number; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, sortOrder } = options;

    const [rows] = await sequelize.query(
      `SELECT * FROM leave_requests WHERE employee_id = :employeeId AND deleted_at IS NULL AND tenant_id = :tenantId ORDER BY created_at ${sortOrder === 'ASC' ? 'ASC' : 'DESC'} LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, employeeId, limit, offset },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM leave_requests WHERE employee_id = :employeeId AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { tenantId, employeeId } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }
}
