import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Includeable, Model, ModelStatic, Op, Sequelize } from 'sequelize';
import { Transaction } from 'sequelize';
import {
  QueryOptions,
  FindAllOptions,
  CreateOptions,
  UpdateOptions,
  BulkCreateOptions,
  BulkUpdateOptions,
} from '@/common/interfaces/repository.interface';
import { PaginatedResult } from '@/common/interfaces/pagination.interface';

export abstract class BaseRepository<T extends Model> {
  constructor(
    protected readonly model: ModelStatic<T>,
    /**
     * true  → every read/write automatically scopes by tenantId
     * false → no tenant filtering (admin access, or child tables scoped by parent FK)
     */
    protected readonly tenantScoped: boolean = false,
  ) {}

  // ── Transaction management ─────────────────────────────────────────────────

  /**
   * Creates a new transaction OR reuses an existing one.
   * The caller is responsible for commit/rollback ONLY if they created it (isOwner = true).
   */
  async createTransaction(options?: { transaction?: Transaction }): Promise<Transaction> {
    if (options?.transaction) {
      return options.transaction;
    }
    return this.model.sequelize!.transaction();
  }

  getSequelize(): Sequelize {
    return this.model.sequelize!;
  }

  // ── Tenant scope guard ─────────────────────────────────────────────────────

  private resolveTenantFilter(
    where: Record<string, unknown>,
    tenantId?: string,
    bypassTenantScope?: boolean,
  ): Record<string, unknown> {
    if (!this.tenantScoped) return where;
    if (tenantId) return { ...where, tenantId };
    if (bypassTenantScope) return where;
    throw new ForbiddenException(
      'Tenant scope required. Pass tenantId or set bypassTenantScope: true explicitly.',
    );
  }

  // ── Read operations ────────────────────────────────────────────────────────

  async findAll(
    options: FindAllOptions & { tenantId?: string; bypassTenantScope?: boolean } = {},
  ): Promise<PaginatedResult<T>> {
    const {
      page = 1,
      limit = 20,
      search,
      searchFields = [],
      sortBy,
      sortOrder = 'DESC',
      lang = 'en',
      where = {},
      include,
      attributes,
      transaction,
      paranoid = true,
      tenantId,
      bypassTenantScope,
    } = options;

    const offset = (page - 1) * limit;
    let whereClause = this.resolveTenantFilter(where, tenantId, bypassTenantScope);

    if (search && searchFields.length > 0) {
      const rawAttrs = (this.model as any).rawAttributes ?? {};
      const searchConditions = searchFields.flatMap((field) => {
        const attr = rawAttrs[field];
        const isJsonb = attr && (attr.type as any)?.key === 'JSONB';
        if (isJsonb) {
          return [
            Sequelize.where(
              Sequelize.fn(
                'LOWER',
                Sequelize.cast(
                  Sequelize.fn('jsonb_extract_path_text', Sequelize.col(field), 'en'),
                  'text',
                ),
              ),
              { [Op.like]: `%${search.toLowerCase()}%` },
            ),
            Sequelize.where(
              Sequelize.fn(
                'LOWER',
                Sequelize.cast(
                  Sequelize.fn('jsonb_extract_path_text', Sequelize.col(field), 'ar'),
                  'text',
                ),
              ),
              { [Op.like]: `%${search.toLowerCase()}%` },
            ),
          ];
        }
        return [
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col(field)), {
            [Op.like]: `%${search.toLowerCase()}%`,
          }),
        ];
      });
      whereClause = { ...whereClause, [Op.or as unknown as string]: searchConditions };
    }

    const nonJsonbFields = new Set([
      'id',
      'slug',
      'status',
      'createdAt',
      'updatedAt',
      'deletedAt',
      'isActive',
      'email',
      'version',
      'plan',
      'planId',
      'tenantId',
      'priority',
    ]);

    let order: [string | ReturnType<typeof Sequelize.fn>, string][] | undefined;
    if (sortBy) {
      if (nonJsonbFields.has(sortBy)) {
        order = [[sortBy, sortOrder]];
      } else {
        order = [[Sequelize.fn('jsonb_extract_path_text', Sequelize.col(sortBy), lang), sortOrder]];
      }
    } else {
      order = [['createdAt', sortOrder]];
    }

    const { rows: data, count: total } = await this.model.findAndCountAll({
      where: whereClause as any,
      include: include as Includeable[],
      attributes,
      order: order as any,
      limit,
      offset,
      transaction,
      paranoid,
    });

    const totalCount = typeof total === 'number' ? total : (total as number[]).length;
    return {
      data: data.map((row) => row.get({ plain: true })) as T[],
      meta: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) },
    };
  }

  async findAllRaw(
    options: QueryOptions & { tenantId?: string; bypassTenantScope?: boolean } = {},
  ): Promise<T[]> {
    const where = this.resolveTenantFilter(
      options.where ?? {},
      options.tenantId,
      options.bypassTenantScope,
    );
    const records = await this.model.findAll({
      where: where as any,
      include: options.include as Includeable[],
      attributes: options.attributes,
      order: options.order as any,
      transaction: options.transaction,
      paranoid: options.paranoid ?? true,
    });
    return records.map((r) => r.get({ plain: true })) as T[];
  }

  async findById(
    id: string,
    options: QueryOptions & { tenantId?: string; bypassTenantScope?: boolean } = {},
  ): Promise<T> {
    const record = await this.findOne({ ...options, where: { id } });
    if (!record) throw new NotFoundException(`${this.model.name} with id ${id} not found`);
    return record;
  }

  async findByIdOrNull(
    id: string,
    options: QueryOptions & { tenantId?: string; bypassTenantScope?: boolean } = {},
  ): Promise<T | null> {
    return this.findOne({ ...options, where: { id } });
  }

  async findOne(
    options: QueryOptions & { tenantId?: string; bypassTenantScope?: boolean } = {},
  ): Promise<T | null> {
    const where = this.resolveTenantFilter(
      options.where ?? {},
      options.tenantId,
      options.bypassTenantScope,
    );
    const record = await this.model.findOne({
      where: where as any,
      include: options.include as Includeable[],
      attributes: options.attributes,
      order: options.order as any,
      transaction: options.transaction,
      paranoid: options.paranoid ?? true,
    });
    return record ? (record.get({ plain: true }) as T) : null;
  }

  async findOneOrFail(
    options: QueryOptions & { tenantId?: string; bypassTenantScope?: boolean } = {},
  ): Promise<T> {
    const record = await this.findOne(options);
    if (!record) throw new NotFoundException(`${this.model.name} not found`);
    return record;
  }

  // ── Write operations ───────────────────────────────────────────────────────

  async create(
    data: Partial<T>,
    options: CreateOptions & { tenantId?: string; bypassTenantScope?: boolean } = {},
  ): Promise<T> {
    const values = { ...data } as Record<string, unknown>;
    if (this.tenantScoped) {
      if (options.tenantId) {
        values.tenantId = options.tenantId;
      } else if (!options.bypassTenantScope)
        throw new ForbiddenException('tenantId is required for tenant-scoped create.');
    }
    if (options.auditContext?.userId) {
      values.createdBy = options.auditContext.userId;
      values.updatedBy = options.auditContext.userId;
    }
    const record = await this.model.create(values as any, { transaction: options.transaction });
    return record.get({ plain: true }) as T;
  }

  async update(
    id: string,
    data: Partial<T>,
    options: UpdateOptions & { tenantId?: string; bypassTenantScope?: boolean } = {},
  ): Promise<T> {
    const record = await this.model.findOne({
      where: this.resolveTenantFilter({ id }, options.tenantId, options.bypassTenantScope) as any,
      transaction: options.transaction,
      lock: options.transaction ? Transaction.LOCK.UPDATE : undefined,
    });
    if (!record) throw new NotFoundException(`${this.model.name} with id ${id} not found`);
    const values = { ...data } as Record<string, unknown>;
    if (options.auditContext?.userId) values.updatedBy = options.auditContext.userId;
    await record.update(values as any, { transaction: options.transaction });
    return record.get({ plain: true }) as T;
  }

  async softDelete(
    id: string,
    options: UpdateOptions & { tenantId?: string; bypassTenantScope?: boolean } = {},
  ): Promise<void> {
    const record = await this.model.findOne({
      where: this.resolveTenantFilter({ id }, options.tenantId, options.bypassTenantScope) as any,
      transaction: options.transaction,
    });
    if (!record) throw new NotFoundException(`${this.model.name} with id ${id} not found`);
    if (options.auditContext?.userId) {
      await record.update({ updatedBy: options.auditContext.userId } as any, {
        transaction: options.transaction,
      });
    }
    await record.destroy({ transaction: options.transaction });
  }

  async hardDelete(
    id: string,
    options: {
      transaction?: Transaction;
      tenantId?: string;
      bypassTenantScope?: boolean;
    } = {},
  ): Promise<void> {
    const record = await this.model.findOne({
      where: this.resolveTenantFilter({ id }, options.tenantId, options.bypassTenantScope) as any,
      transaction: options.transaction,
      paranoid: false,
    });
    if (!record) throw new NotFoundException(`${this.model.name} with id ${id} not found`);
    await record.destroy({ force: true, transaction: options.transaction });
  }

  async restore(
    id: string,
    options: {
      transaction?: Transaction;
      tenantId?: string;
      bypassTenantScope?: boolean;
    } = {},
  ): Promise<T> {
    const record = await this.model.findOne({
      where: this.resolveTenantFilter({ id }, options.tenantId, options.bypassTenantScope) as any,
      paranoid: false,
      transaction: options.transaction,
    });
    if (!record) throw new NotFoundException(`${this.model.name} with id ${id} not found`);
    await record.restore({ transaction: options.transaction });
    return record.get({ plain: true }) as T;
  }

  // ── Bulk operations ────────────────────────────────────────────────────────

  async bulkCreate(
    options: BulkCreateOptions & { tenantId?: string; bypassTenantScope?: boolean },
  ): Promise<T[]> {
    const data = options.data.map((item) => {
      const record = { ...item };
      if (this.tenantScoped && options.tenantId) record.tenantId = options.tenantId;
      if (options.auditContext?.userId) {
        record.createdBy = options.auditContext.userId;
        record.updatedBy = options.auditContext.userId;
      }
      return record;
    });
    const created = await this.model.bulkCreate(data as any[], {
      transaction: options.transaction,
      updateOnDuplicate: options.updateOnDuplicate,
    });
    return created.map((r) => r.get({ plain: true })) as T[];
  }

  async bulkUpdate(
    options: BulkUpdateOptions & { tenantId?: string; bypassTenantScope?: boolean },
  ): Promise<[affectedCount: number]> {
    const where = this.resolveTenantFilter(
      options.where,
      options.tenantId,
      options.bypassTenantScope,
    );
    const values = { ...options.data } as Record<string, unknown>;
    if (options.auditContext?.userId) values.updatedBy = options.auditContext.userId;
    return this.model.update(values as any, {
      where: where as any,
      transaction: options.transaction,
    });
  }

  // ── Utility ────────────────────────────────────────────────────────────────

  async count(
    options: QueryOptions & { tenantId?: string; bypassTenantScope?: boolean } = {},
  ): Promise<number> {
    const where = this.resolveTenantFilter(
      options.where ?? {},
      options.tenantId,
      options.bypassTenantScope,
    );
    const result = await this.model.count({
      where: where as any,
      include: options.include as Includeable[],
      transaction: options.transaction,
      paranoid: options.paranoid ?? true,
    });
    return typeof result === 'number' ? result : (result as unknown[]).length;
  }

  async exists(
    where: Record<string, unknown>,
    options: { tenantId?: string; bypassTenantScope?: boolean } = {},
  ): Promise<boolean> {
    const resolved = this.resolveTenantFilter(where, options.tenantId, options.bypassTenantScope);
    const count = await this.model.count({ where: resolved as any });
    return count > 0;
  }

  async findOrCreate(
    where: Record<string, unknown>,
    defaults: Record<string, unknown>,
    options: CreateOptions & { tenantId?: string; bypassTenantScope?: boolean } = {},
  ): Promise<[T, boolean]> {
    const resolved = this.resolveTenantFilter(where, options.tenantId, options.bypassTenantScope);
    if (this.tenantScoped && options.tenantId) defaults.tenantId = options.tenantId;
    if (options.auditContext?.userId) {
      defaults.createdBy = options.auditContext.userId;
      defaults.updatedBy = options.auditContext.userId;
    }
    const [record, created] = await this.model.findOrCreate({
      where: resolved as any,
      defaults: defaults as any,
      transaction: options.transaction,
    });
    return [record.get({ plain: true }) as T, created];
  }

  /**
   * Use ONLY for:
   * - Recursive CTEs (account tree, cost center tree)
   * - Complex aggregations (reports, running balances)
   * - Atomic numeric operations (stock deduction, point balance update)
   * Never use for simple CRUD.
   */
  async rawQuery<R = unknown>(
    sql: string,
    replacements?: Record<string, unknown>,
    transaction?: Transaction,
  ): Promise<R> {
    const [results] = await this.model.sequelize!.query(sql, { replacements, transaction });
    return results as R;
  }
}
