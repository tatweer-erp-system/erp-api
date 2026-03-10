import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class LeavesService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, offset = 0 } = pagination;
    const [rows] = await sequelize.query(
      `SELECT lr.*, e.user_id, u.first_name, u.last_name
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       JOIN users u ON u.id = e.user_id
       WHERE lr.deleted_at IS NULL
       ORDER BY lr.created_at DESC LIMIT :limit OFFSET :offset`,
      { replacements: { limit, offset }, type: 'SELECT' } as any,
    );
    return rows;
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT * FROM leave_requests WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const leave = (rows as any[])[0];
    if (!leave) throw new NotFoundException('Leave request not found');
    return leave;
  }

  async create(tenantSlug: string, dto: CreateLeaveRequestDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, days_requested,
       reason, status, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :employeeId, :leaveType, :startDate, :endDate, :daysRequested,
       :reason, 'pending', :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          ...dto,
          reason: dto.reason ?? null,
          createdBy: createdBy ?? null,
        },
      } as any,
    );
    return this.findOne(tenantSlug, id);
  }

  async approve(tenantSlug: string, id: string, approvedBy: string) {
    await this.findOne(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE leave_requests SET status = 'approved', approved_by = :approvedBy, approved_at = NOW(), updated_at = NOW()
       WHERE id = :id`,
      { replacements: { id, approvedBy } } as any,
    );
    return this.findOne(tenantSlug, id);
  }

  async reject(tenantSlug: string, id: string, rejectedBy: string, reason?: string) {
    await this.findOne(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE leave_requests SET status = 'rejected', approved_by = :rejectedBy,
       rejection_reason = :reason, updated_at = NOW() WHERE id = :id`,
      { replacements: { id, rejectedBy, reason: reason ?? null } } as any,
    );
    return this.findOne(tenantSlug, id);
  }
}
