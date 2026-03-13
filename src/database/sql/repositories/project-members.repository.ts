import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class ProjectMembersRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByProject(tenantId: string, projectId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT pm.*, u.email, u."firstName", u."lastName"
       FROM project_members pm
       LEFT JOIN users u ON u.id = pm."userId"
       WHERE pm."projectId" = :projectId AND pm."tenantId" = :tenantId
       ORDER BY pm."createdAt" ASC`,
      { replacements: { projectId, tenantId } } as any,
    );
    return (rows ?? []) as any[];
  }

  async findOne(tenantId: string, projectId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM project_members
       WHERE "projectId" = :projectId AND "userId" = :userId AND "tenantId" = :tenantId`,
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
      `INSERT INTO project_members ("tenantId", "projectId", "userId", role, "createdBy", "updatedBy", version, "createdAt", "updatedAt")
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
      `UPDATE project_members SET role = :role, "updatedBy" = :updatedBy, "updatedAt" = NOW()
       WHERE "projectId" = :projectId AND "userId" = :userId AND "tenantId" = :tenantId`,
      {
        replacements: { role, updatedBy, projectId, userId, tenantId },
      } as any,
    );
  }

  async remove(tenantId: string, projectId: string, userId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `DELETE FROM project_members
       WHERE "projectId" = :projectId AND "userId" = :userId AND "tenantId" = :tenantId`,
      { replacements: { projectId, userId, tenantId } } as any,
    );
  }

  async findAssignableUsers(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT u.id, u.email, u."firstName", u."lastName", e."employeeNumber", e.position
       FROM users u
       INNER JOIN employees e ON e."userId" = u.id AND e."tenantId" = :tenantId AND e."deletedAt" IS NULL
       WHERE u."tenantId" = :tenantId AND u."deletedAt" IS NULL AND u."isActive" = true
       ORDER BY u."firstName" ASC`,
      { replacements: { tenantId } } as any,
    );
    return (rows ?? []) as any[];
  }
}
