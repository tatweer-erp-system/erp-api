import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class ProjectMembersRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByProject(tenantId: string, projectId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT pm.*, u.email, u.first_name, u.last_name
       FROM project_members pm
       LEFT JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = :projectId AND pm.tenant_id = :tenantId
       ORDER BY pm.created_at ASC`,
      { replacements: { projectId, tenantId } } as any,
    );
    return (rows ?? []) as any[];
  }

  async findOne(tenantId: string, projectId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM project_members
       WHERE project_id = :projectId AND user_id = :userId AND tenant_id = :tenantId`,
      { replacements: { projectId, userId, tenantId } } as any,
    );
    return ((rows ?? []) as any[])[0] ?? null;
  }

  async insert(
    tenantId: string,
    data: {
      projectId: string;
      userId: string;
      role: string;
      createdBy?: string | null;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `INSERT INTO project_members (tenant_id, project_id, user_id, role, created_by, updated_by, version, created_at, updated_at)
       VALUES (:tenantId, :projectId, :userId, :role, :createdBy, :createdBy, 1, NOW(), NOW())
       RETURNING *`,
      {
        replacements: {
          tenantId,
          projectId: data.projectId,
          userId: data.userId,
          role: data.role,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return ((rows ?? []) as any[])[0];
  }

  async updateRole(
    tenantId: string,
    projectId: string,
    userId: string,
    role: string,
    updatedBy?: string | null,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE project_members SET role = :role, updated_by = :updatedBy, updated_at = NOW()
       WHERE project_id = :projectId AND user_id = :userId AND tenant_id = :tenantId`,
      {
        replacements: { role, updatedBy, projectId, userId, tenantId },
      } as any,
    );
  }

  async remove(tenantId: string, projectId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `DELETE FROM project_members
       WHERE project_id = :projectId AND user_id = :userId AND tenant_id = :tenantId`,
      { replacements: { projectId, userId, tenantId } } as any,
    );
  }

  async findAssignableUsers(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, e.employee_number, e.position
       FROM users u
       INNER JOIN employees e ON e.user_id = u.id AND e.tenant_id = :tenantId AND e.deleted_at IS NULL
       WHERE u.tenant_id = :tenantId AND u.deleted_at IS NULL AND u.is_active = true
       ORDER BY u.first_name ASC`,
      { replacements: { tenantId } } as any,
    );
    return (rows ?? []) as any[];
  }
}
