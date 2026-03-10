import { NotFoundException } from '@nestjs/common';
import { Model, ModelStatic, Op, Sequelize } from 'sequelize';
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

    // Bilingual iLike search
    if (search && searchFields.length > 0) {
      const searchConditions = searchFields.flatMap((field) => [
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.cast(Sequelize.fn('jsonb_extract_path_text', Sequelize.col(field), 'en'), 'text')),
          { [Op.like]: `%${search.toLowerCase()}%` },
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.cast(Sequelize.fn('jsonb_extract_path_text', Sequelize.col(field), 'ar'), 'text')),
          { [Op.like]: `%${search.toLowerCase()}%` },
        ),
      ]);
      whereClause[Op.or as unknown as string] = searchConditions;
    }

    // Bilingual sort
    let order: [string | ReturnType<typeof Sequelize.fn>, string][] | undefined;
    if (sortBy) {
      const sortColumn = Sequelize.fn('jsonb_extract_path_text', Sequelize.col(sortBy), lang);
      order = [[sortColumn, sortOrder]];
    } else {
      order = [['created_at', sortOrder]];
    }

    const { rows: data, count: total } = await this.model.findAndCountAll({
      where: whereClause as any,
      include,
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
      totalPages: Math.ceil((typeof total === 'number' ? total : (total as number[]).length) / limit),
    };

    return { data: data as T[], meta };
  }

  async findById(id: string, options: QueryOptions = {}): Promise<T> {
    const record = await this.model.findByPk(id, {
      include: options.include,
      attributes: options.attributes,
      transaction: options.transaction,
      paranoid: options.paranoid ?? true,
    });
    if (!record) {
      throw new NotFoundException(`${this.model.name} with id ${id} not found`);
    }
    return record as T;
  }

  async findByIdOrNull(id: string, options: QueryOptions = {}): Promise<T | null> {
    return this.model.findByPk(id, {
      include: options.include,
      attributes: options.attributes,
      transaction: options.transaction,
      paranoid: options.paranoid ?? true,
    }) as Promise<T | null>;
  }

  async findOne(options: QueryOptions = {}): Promise<T | null> {
    return this.model.findOne({
      where: options.where as any,
      include: options.include,
      attributes: options.attributes,
      order: options.order as any,
      transaction: options.transaction,
      paranoid: options.paranoid ?? true,
    }) as Promise<T | null>;
  }

  async findOneOrFail(options: QueryOptions = {}): Promise<T> {
    const record = await this.findOne(options);
    if (!record) {
      throw new NotFoundException(`${this.model.name} not found`);
    }
    return record;
  }

  async findAllRaw(options: QueryOptions = {}): Promise<T[]> {
    return this.model.findAll({
      where: options.where as any,
      include: options.include,
      attributes: options.attributes,
      order: options.order as any,
      transaction: options.transaction,
      paranoid: options.paranoid ?? true,
    }) as Promise<T[]>;
  }

  // ── Write operations ───────────────────────────────────────────────────────

  async create(data: Partial<T>, options: CreateOptions = {}): Promise<T> {
    const values = { ...data } as Record<string, unknown>;
    if (options.auditContext?.userId) {
      values.created_by = options.auditContext.userId;
      values.updated_by = options.auditContext.userId;
    }
    return this.model.create(values as any, {
      transaction: options.transaction,
    }) as Promise<T>;
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
    return record as T;
  }

  async softDelete(id: string, options: UpdateOptions = {}): Promise<void> {
    const record = await this.findById(id, { transaction: options.transaction });
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
    return record as T;
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

    return this.model.bulkCreate(records as any[], {
      transaction: options.transaction,
      updateOnDuplicate: options.updateOnDuplicate,
    }) as Promise<T[]>;
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
    return this.model.count({
      where: options.where as any,
      include: options.include,
      transaction: options.transaction,
      paranoid: options.paranoid ?? true,
    });
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
