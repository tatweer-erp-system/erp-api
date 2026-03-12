import { NotFoundException } from '@nestjs/common';
import { Includeable, Model, ModelStatic, Op, Sequelize } from 'sequelize';
import { Transaction } from 'sequelize';
import {
  QueryOptions,
  FindAllOptions,
  CreateOptions,
  UpdateOptions,
  BulkCreateOptions,
  BulkUpdateOptions,
  AuditContext,
} from '@/common/interfaces/repository.interface';
import { PaginatedResult, PaginationMeta } from '@/common/interfaces/pagination.interface';

export abstract class BaseRepository<T extends Model> {
  constructor(protected readonly model: ModelStatic<T>) {}

  // ── Read operations ────────────────────────────────────────────────────────

  async findAll(options: FindAllOptions = {}): Promise<PaginatedResult<T>> {
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
    } = options;

    const offset = (page - 1) * limit;
    const whereClause: Record<string, unknown> = { ...where };

    // Search — detect JSONB vs plain text fields automatically
    if (search && searchFields.length > 0) {
      const rawAttrs = (this.model as any).rawAttributes ?? {};
      const searchConditions = searchFields.flatMap((field) => {
        const attr = rawAttrs[field];
        const isJsonb = attr && (attr.type as any)?.key === 'JSONB';

        if (isJsonb) {
          // Bilingual JSONB search (en + ar)
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

        // Plain text field — simple iLike
        const snakeField = field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        return [
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col(snakeField)), {
            [Op.like]: `%${search.toLowerCase()}%`,
          }),
        ];
      });
      whereClause[Op.or as unknown as string] = searchConditions;
    }

    // Sort — use JSONB extraction only for known bilingual fields, otherwise sort directly
    const nonJsonbFields = new Set([
      'id',
      'slug',
      'status',
      'createdAt',
      'updatedAt',
      'deletedAt',
      'created_at',
      'updated_at',
      'deleted_at',
      'is_active',
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
        // Use underscored column name for direct sorting
        const snakeCase = sortBy.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        order = [[snakeCase, sortOrder]];
      } else {
        const sortColumn = Sequelize.fn('jsonb_extract_path_text', Sequelize.col(sortBy), lang);
        order = [[sortColumn, sortOrder]];
      }
    } else {
      order = [['created_at', sortOrder]];
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

    const meta: PaginationMeta = {
      page,
      limit,
      total: typeof total === 'number' ? total : (total as number[]).length,
      totalPages: Math.ceil(
        (typeof total === 'number' ? total : (total as number[]).length) / limit,
      ),
    };

    return { data: data.map((row) => row.get({ plain: true })) as T[], meta };
  }

  async findById(id: string, options: QueryOptions = {}): Promise<T> {
    const record = await this.model.findByPk(id, {
      include: options.include as Includeable[],
      attributes: options.attributes,
      transaction: options.transaction,
      paranoid: options.paranoid ?? true,
    });
    if (!record) {
      throw new NotFoundException(`${this.model.name} with id ${id} not found`);
    }
    return record.get({ plain: true }) as T;
  }

  async findByIdOrNull(id: string, options: QueryOptions = {}): Promise<T | null> {
    const record = await this.model.findByPk(id, {
      include: options.include as Includeable[],
      attributes: options.attributes,
      transaction: options.transaction,
      paranoid: options.paranoid ?? true,
    });
    return record ? (record.get({ plain: true }) as T) : null;
  }

  async findOne(options: QueryOptions = {}): Promise<T | null> {
    const record = await this.model.findOne({
      where: options.where as any,
      include: options.include as Includeable[],
      attributes: options.attributes,
      order: options.order as any,
      transaction: options.transaction,
      paranoid: options.paranoid ?? true,
    });
    return record ? (record.get({ plain: true }) as T) : null;
  }

  async findOneOrFail(options: QueryOptions = {}): Promise<T> {
    const record = await this.findOne(options);
    if (!record) {
      throw new NotFoundException(`${this.model.name} not found`);
    }
    return record;
  }

  async findAllRaw(options: QueryOptions = {}): Promise<T[]> {
    const records = await this.model.findAll({
      where: options.where as any,
      include: options.include as Includeable[],
      attributes: options.attributes,
      order: options.order as any,
      transaction: options.transaction,
      paranoid: options.paranoid ?? true,
    });
    return records.map((r) => r.get({ plain: true })) as T[];
  }

  // ── Write operations ───────────────────────────────────────────────────────

  async create(data: Partial<T>, options: CreateOptions = {}): Promise<T> {
    const values = { ...data } as Record<string, unknown>;
    if (options.auditContext?.userId) {
      values.created_by = options.auditContext.userId;
      values.updated_by = options.auditContext.userId;
    }
    const record = await this.model.create(values as any, {
      transaction: options.transaction,
    });
    return record.get({ plain: true }) as T;
  }

  async update(id: string, data: Partial<T>, options: UpdateOptions = {}): Promise<T> {
    const record = await this.model.findByPk(id, {
      transaction: options.transaction,
      lock: options.transaction ? Transaction.LOCK.UPDATE : undefined,
    });
    if (!record) {
      throw new NotFoundException(`${this.model.name} with id ${id} not found`);
    }

    const values = { ...data } as Record<string, unknown>;
    if (options.auditContext?.userId) {
      values.updated_by = options.auditContext.userId;
    }

    await record.update(values as any, { transaction: options.transaction });
    return record.get({ plain: true }) as T;
  }

  async softDelete(id: string, options: UpdateOptions = {}): Promise<void> {
    const record = await this.model.findByPk(id, { transaction: options.transaction });
    if (!record) {
      throw new NotFoundException(`${this.model.name} with id ${id} not found`);
    }
    const values: Record<string, unknown> = {};
    if (options.auditContext?.userId) {
      values.updated_by = options.auditContext.userId;
    }
    if (Object.keys(values).length > 0) {
      await record.update(values as any, { transaction: options.transaction });
    }
    await record.destroy({ transaction: options.transaction });
  }

  async hardDelete(id: string, options: { transaction?: Transaction } = {}): Promise<void> {
    const record = await this.model.findByPk(id, {
      transaction: options.transaction,
      paranoid: false,
    });
    if (!record) {
      throw new NotFoundException(`${this.model.name} with id ${id} not found`);
    }
    await record.destroy({ force: true, transaction: options.transaction });
  }

  async restore(id: string, options: { transaction?: Transaction } = {}): Promise<T> {
    const record = await this.model.findByPk(id, {
      paranoid: false,
      transaction: options.transaction,
    });
    if (!record) {
      throw new NotFoundException(`${this.model.name} with id ${id} not found`);
    }
    await record.restore({ transaction: options.transaction });
    return record.get({ plain: true }) as T;
  }

  // ── Bulk operations ────────────────────────────────────────────────────────

  async bulkCreate(options: BulkCreateOptions): Promise<T[]> {
    const records = options.data.map((item) => {
      if (options.auditContext?.userId) {
        item.created_by = options.auditContext.userId;
        item.updated_by = options.auditContext.userId;
      }
      return item;
    });

    const created = await this.model.bulkCreate(records as any[], {
      transaction: options.transaction,
      updateOnDuplicate: options.updateOnDuplicate,
    });
    return created.map((r) => r.get({ plain: true })) as T[];
  }

  async bulkUpdate(options: BulkUpdateOptions): Promise<[affectedCount: number]> {
    const values = { ...options.data } as Record<string, unknown>;
    if (options.auditContext?.userId) {
      values.updated_by = options.auditContext.userId;
    }
    return this.model.update(values as any, {
      where: options.where as any,
      transaction: options.transaction,
    });
  }

  // ── Utility operations ─────────────────────────────────────────────────────

  async count(options: QueryOptions = {}): Promise<number> {
    const result = await this.model.count({
      where: options.where as any,
      include: options.include as Includeable[],
      transaction: options.transaction,
      paranoid: options.paranoid ?? true,
    });
    return typeof result === 'number' ? result : (result as unknown[]).length;
  }

  async exists(where: Record<string, unknown>): Promise<boolean> {
    const count = await this.model.count({ where: where as any });
    return count > 0;
  }

  async findOrCreate(
    where: Record<string, unknown>,
    defaults: Record<string, unknown>,
    options: CreateOptions = {},
  ): Promise<[T, boolean]> {
    if (options.auditContext?.userId) {
      defaults.created_by = options.auditContext.userId;
      defaults.updated_by = options.auditContext.userId;
    }
    const [record, created] = await this.model.findOrCreate({
      where: where as any,
      defaults: defaults as any,
      transaction: options.transaction,
    });
    return [record as T, created];
  }

  async rawQuery<R = unknown>(
    sql: string,
    replacements?: Record<string, unknown>,
    transaction?: Transaction,
  ): Promise<R> {
    const [results] = await this.model.sequelize!.query(sql, {
      replacements,
      transaction,
    });
    return results as R;
  }
}

export abstract class TenantAwareRepository<T extends Model> extends BaseRepository<T> {
  constructor(model: ModelStatic<T>) {
    super(model);
  }

  private addTenantFilter(
    where: Record<string, unknown>,
    tenantId: string,
  ): Record<string, unknown> {
    return { ...where, tenant_id: tenantId };
  }

  // ── Tenant-aware read operations ──────────────────────────────────────────

  async findAll(options: FindAllOptions & { tenantId: string }): Promise<PaginatedResult<T>> {
    return super.findAll({
      ...options,
      where: this.addTenantFilter(options.where ?? {}, options.tenantId),
    });
  }

  async findById(id: string, options: QueryOptions & { tenantId: string }): Promise<T> {
    const record = await this.findOne({
      ...options,
      where: this.addTenantFilter({ id }, options.tenantId),
    });
    if (!record) {
      throw new NotFoundException(`${this.model.name} with id ${id} not found`);
    }
    return record;
  }

  async findByIdOrNull(
    id: string,
    options: QueryOptions & { tenantId: string },
  ): Promise<T | null> {
    return this.findOne({
      ...options,
      where: this.addTenantFilter({ id }, options.tenantId),
    });
  }

  async findOne(options: QueryOptions & { tenantId: string }): Promise<T | null> {
    return super.findOne({
      ...options,
      where: this.addTenantFilter(options.where ?? {}, options.tenantId),
    });
  }

  async findOneOrFail(options: QueryOptions & { tenantId: string }): Promise<T> {
    return super.findOneOrFail({
      ...options,
      where: this.addTenantFilter(options.where ?? {}, options.tenantId),
    });
  }

  async findAllRaw(options: QueryOptions & { tenantId: string }): Promise<T[]> {
    return super.findAllRaw({
      ...options,
      where: this.addTenantFilter(options.where ?? {}, options.tenantId),
    });
  }

  // ── Tenant-aware write operations ─────────────────────────────────────────

  async create(data: Partial<T>, options: CreateOptions & { tenantId: string }): Promise<T> {
    (data as any).tenant_id = options.tenantId;
    return super.create(data, options);
  }

  async update(
    id: string,
    data: Partial<T>,
    options: UpdateOptions & { tenantId: string },
  ): Promise<T> {
    // Verify record belongs to tenant before updating
    await this.findById(id, options);
    return super.update(id, data, options);
  }

  async softDelete(id: string, options: UpdateOptions & { tenantId: string }): Promise<void> {
    // Verify record belongs to tenant before deleting
    await this.findById(id, options);
    return super.softDelete(id, options);
  }

  async hardDelete(
    id: string,
    options: { transaction?: Transaction; tenantId: string },
  ): Promise<void> {
    await this.findById(id, { tenantId: options.tenantId, transaction: options.transaction });
    return super.hardDelete(id, options);
  }

  async restore(id: string, options: { transaction?: Transaction; tenantId: string }): Promise<T> {
    // For restore, we need to find with paranoid: false
    const record = await super.findOne({
      where: this.addTenantFilter({ id }, options.tenantId) as any,
      paranoid: false,
      transaction: options.transaction,
    });
    if (!record) {
      throw new NotFoundException(`${this.model.name} with id ${id} not found`);
    }
    await (record as any).restore({ transaction: options.transaction });
    return record;
  }

  // ── Tenant-aware bulk operations ──────────────────────────────────────────

  async bulkCreate(options: BulkCreateOptions & { tenantId: string }): Promise<T[]> {
    const data = options.data.map((item) => ({ ...item, tenant_id: options.tenantId }));
    return super.bulkCreate({ ...options, data });
  }

  async bulkUpdate(
    options: BulkUpdateOptions & { tenantId: string },
  ): Promise<[affectedCount: number]> {
    return super.bulkUpdate({
      ...options,
      where: this.addTenantFilter(options.where, options.tenantId),
    });
  }

  // ── Tenant-aware utility operations ───────────────────────────────────────

  async count(options: QueryOptions & { tenantId: string }): Promise<number> {
    return super.count({
      ...options,
      where: this.addTenantFilter(options.where ?? {}, options.tenantId),
    });
  }

  async exists(where: Record<string, unknown>, tenantId?: string): Promise<boolean> {
    if (!tenantId) {
      return super.exists(where);
    }
    return super.exists(this.addTenantFilter(where, tenantId));
  }

  async findOrCreate(
    where: Record<string, unknown>,
    defaults: Record<string, unknown>,
    options: CreateOptions & { tenantId: string },
  ): Promise<[T, boolean]> {
    (defaults as any).tenant_id = options.tenantId;
    return super.findOrCreate(this.addTenantFilter(where, options.tenantId), defaults, options);
  }
}
