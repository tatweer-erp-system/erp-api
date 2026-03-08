import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class TasksService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, projectId: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 50, offset = 0 } = pagination;
    const [rows] = await sequelize.query(
      `SELECT t.*, u.first_name, u.last_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.project_id = :projectId AND t.deleted_at IS NULL ORDER BY t.created_at DESC LIMIT :limit OFFSET :offset`,
      { replacements: { projectId, limit, offset }, type: 'SELECT' } as any,
    );
    return rows;
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(`SELECT * FROM tasks WHERE id = :id AND deleted_at IS NULL`, { replacements: { id }, type: 'SELECT' } as any);
    const task = (rows as any[])[0];
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(tenantSlug: string, dto: CreateTaskDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO tasks (id, project_id, title, description, status, priority, assigned_to, due_date, estimated_hours, parent_task_id, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :projectId, :title, :description, :status, :priority, :assignedTo, :dueDate, :estimatedHours, :parentTaskId, :createdBy, :createdBy, NOW(), NOW())`,
      { replacements: { id, projectId: dto.projectId, title: JSON.stringify(dto.title), description: dto.description ? JSON.stringify(dto.description) : null, status: dto.status ?? 'todo', priority: dto.priority ?? 'medium', assignedTo: dto.assignedTo ?? null, dueDate: dto.dueDate ?? null, estimatedHours: dto.estimatedHours ?? 0, parentTaskId: dto.parentTaskId ?? null, createdBy: createdBy ?? null } } as any,
    );
    return this.findOne(tenantSlug, id);
  }
}
