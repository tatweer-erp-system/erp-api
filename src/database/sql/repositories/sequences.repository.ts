import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Sequence } from '../entities/sequence.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { Transaction } from 'sequelize';

@Injectable()
export class SequencesRepository extends BaseRepository<Sequence> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Sequence, true);
  }

  /**
   * Find a sequence row with SELECT FOR UPDATE lock within a transaction.
   */
  async findForUpdate(
    tenantId: string,
    entity: string,
    branchId: string | null,
    transaction: Transaction,
  ): Promise<Sequence | null> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const branchClause = branchId ? 'AND "branchId" = :branchId' : 'AND "branchId" IS NULL';

    const [rows] = await sequelize.query(
      `SELECT * FROM sequences
       WHERE "tenantId" = :tenantId
         AND entity = :entity
         ${branchClause}
         AND "deletedAt" IS NULL
       FOR UPDATE`,
      {
        replacements: { tenantId, entity, branchId },
        transaction,
      },
    );

    const result = rows as unknown as Record<string, unknown>[];
    return result.length > 0 ? (result[0] as unknown as Sequence) : null;
  }

  /**
   * Increment last_value atomically and optionally reset fiscal fields.
   */
  async incrementAndGet(
    id: string,
    resetFields: { lastValue: number; fiscalYear?: number; fiscalMonth?: number } | null,
    transaction: Transaction,
  ): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    if (resetFields) {
      // Reset then increment
      const fiscalYearClause =
        resetFields.fiscalYear !== undefined ? ', "fiscalYear" = :fiscalYear' : '';
      const fiscalMonthClause =
        resetFields.fiscalMonth !== undefined ? ', "fiscalMonth" = :fiscalMonth' : '';

      await sequelize.query(
        `UPDATE sequences
         SET "lastValue" = :lastValue${fiscalYearClause}${fiscalMonthClause}, "updatedAt" = NOW()
         WHERE id = :id`,
        {
          replacements: {
            id,
            lastValue: resetFields.lastValue,
            fiscalYear: resetFields.fiscalYear,
            fiscalMonth: resetFields.fiscalMonth,
          },
          transaction,
        },
      );

      return resetFields.lastValue;
    }

    // Simple increment
    const [rows] = await sequelize.query(
      `UPDATE sequences
       SET "lastValue" = "lastValue" + 1, "updatedAt" = NOW()
       WHERE id = :id
       RETURNING "lastValue"`,
      { replacements: { id }, transaction },
    );

    return (rows as unknown as Array<{ lastValue: number }>)[0].lastValue;
  }

  /**
   * Reset last_value to 0 with version check for optimistic locking.
   */
  async resetCounter(
    id: string,
    tenantId: string,
    currentVersion: number,
    transaction: Transaction,
  ): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [, affectedCount] = await sequelize.query(
      `UPDATE sequences
       SET "lastValue" = 0, version = version + 1, "updatedAt" = NOW()
       WHERE id = :id AND "tenantId" = :tenantId AND version = :currentVersion AND "deletedAt" IS NULL`,
      { replacements: { id, tenantId, currentVersion }, transaction },
    );

    return affectedCount as unknown as number;
  }

  /**
   * Find all company-wide (branchId IS NULL) sequences for a tenant.
   */
  async findCompanyWide(tenantId: string): Promise<Sequence[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT * FROM sequences
       WHERE "tenantId" = :tenantId AND "branchId" IS NULL AND "deletedAt" IS NULL
       ORDER BY entity ASC`,
      { replacements: { tenantId } },
    );

    return rows as unknown as Sequence[];
  }

  /**
   * Find all sequences for a tenant (paginated via parent class or raw).
   */
  async findAllForTenant(tenantId: string): Promise<Sequence[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT * FROM sequences
       WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL
       ORDER BY entity ASC, "branchId" ASC NULLS FIRST`,
      { replacements: { tenantId } },
    );

    return rows as unknown as Sequence[];
  }

  getSequelize() {
    return this.tenantSequelizeService.getSharedSequelize();
  }
}
