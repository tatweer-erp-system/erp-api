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
    const branchClause = branchId ? 'AND branch_id = :branchId' : 'AND branch_id IS NULL';

    const [rows] = await sequelize.query(
      `SELECT * FROM sequences
       WHERE tenant_id = :tenantId
         AND entity = :entity
         ${branchClause}
         AND deleted_at IS NULL
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
        resetFields.fiscalYear !== undefined ? ', fiscal_year = :fiscalYear' : '';
      const fiscalMonthClause =
        resetFields.fiscalMonth !== undefined ? ', fiscal_month = :fiscalMonth' : '';

      await sequelize.query(
        `UPDATE sequences
         SET last_value = :lastValue${fiscalYearClause}${fiscalMonthClause}, updated_at = NOW()
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
       SET last_value = last_value + 1, updated_at = NOW()
       WHERE id = :id
       RETURNING last_value`,
      { replacements: { id }, transaction },
    );

    return (rows as unknown as Array<{ last_value: number }>)[0].last_value;
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
       SET last_value = 0, version = version + 1, updated_at = NOW()
       WHERE id = :id AND tenant_id = :tenantId AND version = :currentVersion AND deleted_at IS NULL`,
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
       WHERE tenant_id = :tenantId AND branch_id IS NULL AND deleted_at IS NULL
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
       WHERE tenant_id = :tenantId AND deleted_at IS NULL
       ORDER BY entity ASC, branch_id ASC NULLS FIRST`,
      { replacements: { tenantId } },
    );

    return rows as unknown as Sequence[];
  }

  getSequelize() {
    return this.tenantSequelizeService.getSharedSequelize();
  }
}
