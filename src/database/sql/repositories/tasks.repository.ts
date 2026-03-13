import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Task } from '../entities/task.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class TasksRepository extends BaseRepository<Task> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Task, true);
  }

  async findByProject(projectId: string, tenantId: string): Promise<Task[]> {
    return this.findAllRaw({
      where: { projectId },
      tenantId,
    });
  }

  async findByAssignee(userId: string, tenantId: string): Promise<Task[]> {
    return this.findAllRaw({
      where: { assignedTo: userId },
      tenantId,
    });
  }

  async countByProject(tenantId: string, projectId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [totalResult] = await sequelize.query(
      `SELECT COUNT(*) as count FROM tasks WHERE "projectId" = :projectId AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { projectId, tenantId } },
    );
    return parseInt((totalResult as unknown as any)?.count ?? '0');
  }

  async countCompletedByProject(tenantId: string, projectId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [doneResult] = await sequelize.query(
      `SELECT COUNT(*) as count FROM tasks WHERE "projectId" = :projectId AND status = 'done' AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { projectId, tenantId } },
    );
    return parseInt((doneResult as unknown as any)?.count ?? '0');
  }
}
