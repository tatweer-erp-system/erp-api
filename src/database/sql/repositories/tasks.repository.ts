import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Task } from '../entities/task.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { TaskStatus } from '@/common/enums/project.enums';

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
      `SELECT COUNT(*) as count FROM tasks WHERE "projectId" = :projectId AND status = :doneStatus AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { projectId, tenantId, doneStatus: TaskStatus.DONE } },
    );
    return parseInt((doneResult as unknown as any)?.count ?? '0');
  }

  async countActiveByProject(tenantId: string, projectId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [result] = await sequelize.query(
      `SELECT COUNT(*) as count FROM tasks
       WHERE "projectId" = :projectId
         AND status NOT IN (:doneStatus, :cancelledStatus)
         AND "deletedAt" IS NULL
         AND "tenantId" = :tenantId`,
      {
        replacements: {
          projectId,
          tenantId,
          doneStatus: TaskStatus.DONE,
          cancelledStatus: TaskStatus.CANCELLED,
        },
      },
    );
    return parseInt((result as unknown as any)?.count ?? '0');
  }

  async countByStatusForProject(
    tenantId: string,
    projectId: string,
  ): Promise<Record<string, number>> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT status, COUNT(*) as count FROM tasks
       WHERE "projectId" = :projectId AND "deletedAt" IS NULL AND "tenantId" = :tenantId
       GROUP BY status`,
      { replacements: { projectId, tenantId } },
    );
    const result: Record<string, number> = {};
    for (const row of rows as any[]) {
      result[row.status] = parseInt(row.count, 10);
    }
    return result;
  }

  async getHoursSummaryForProject(
    tenantId: string,
    projectId: string,
  ): Promise<{ estimatedHours: number; loggedHours: number }> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT COALESCE(SUM("estimatedHours"), 0) as "estimatedHours",
              COALESCE(SUM("loggedHours"), 0) as "loggedHours"
       FROM tasks
       WHERE "projectId" = :projectId AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { projectId, tenantId } },
    );
    const row = (rows as any[])[0] ?? { estimatedHours: 0, loggedHours: 0 };
    return {
      estimatedHours: Number(row.estimatedHours) || 0,
      loggedHours: Number(row.loggedHours) || 0,
    };
  }

  async countOverdueByProject(tenantId: string, projectId: string): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [result] = await sequelize.query(
      `SELECT COUNT(*) as count FROM tasks
       WHERE "projectId" = :projectId
         AND "dueDate" < CURRENT_DATE
         AND status NOT IN (:doneStatus, :cancelledStatus)
         AND "deletedAt" IS NULL
         AND "tenantId" = :tenantId`,
      {
        replacements: {
          projectId,
          tenantId,
          doneStatus: TaskStatus.DONE,
          cancelledStatus: TaskStatus.CANCELLED,
        },
      },
    );
    return parseInt((result as unknown as any)?.count ?? '0');
  }

  async findOverdue(tenantId: string, projectId: string): Promise<any[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM tasks
       WHERE "projectId" = :projectId
         AND "dueDate" < CURRENT_DATE
         AND status NOT IN (:doneStatus, :cancelledStatus)
         AND "deletedAt" IS NULL
         AND "tenantId" = :tenantId
       ORDER BY "dueDate" ASC`,
      {
        replacements: {
          projectId,
          tenantId,
          doneStatus: TaskStatus.DONE,
          cancelledStatus: TaskStatus.CANCELLED,
        },
      },
    );
    return rows as any[];
  }

  async atomicIncrementLoggedHours(tenantId: string, taskId: string, hours: number): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE tasks SET "loggedHours" = "loggedHours" + :hours, "updatedAt" = NOW()
       WHERE id = :taskId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { replacements: { taskId, tenantId, hours } } as any,
    );
  }
}
