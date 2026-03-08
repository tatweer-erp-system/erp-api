import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, offset = 0 } = pagination;
    const [rows] = await sequelize.query(`SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT :limit OFFSET :offset`, { replacements: { limit, offset }, type: 'SELECT' } as any);
    return rows;
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(`SELECT * FROM projects WHERE id = :id AND deleted_at IS NULL`, { replacements: { id }, type: 'SELECT' } as any);
    const project = (rows as any[])[0];
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(tenantSlug: string, dto: CreateProjectDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO projects (id, name, description, status, start_date, end_date, budget, manager_id, members, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :name, :description, :status, :startDate, :endDate, :budget, :managerId, '[]', :createdBy, :createdBy, NOW(), NOW())`,
      { replacements: { id, name: JSON.stringify(dto.name), description: dto.description ? JSON.stringify(dto.description) : null, status: dto.status ?? 'planning', startDate: dto.startDate ?? null, endDate: dto.endDate ?? null, budget: dto.budget ?? null, managerId: dto.managerId ?? null, createdBy: createdBy ?? null } } as any,
    );
    return this.findOne(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string): Promise<void> {
    await this.findOne(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(`UPDATE projects SET deleted_at = NOW() WHERE id = :id`, { replacements: { id } } as any);
  }
}
