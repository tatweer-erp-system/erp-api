import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { TenantSequelizeService } from '../../database/sql/tenant-sequelize.service';
import { Release } from './entities/release.entity';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';

@Injectable()
export class ReleasesService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  private getSequelize() {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    sequelize.addModels([Release]);
    return sequelize;
  }

  async findAll(
    page: number,
    limit: number,
    filters: { search?: string; type?: string; isPublished?: boolean },
  ) {
    const sequelize = this.getSequelize();

    const conditions: string[] = ['r.deleted_at IS NULL'];
    const replacements: Record<string, unknown> = {};

    if (filters.search) {
      conditions.push(
        `(r.version ILIKE :search OR r.title_en ILIKE :search OR r.title_ar ILIKE :search
          OR r.description_en ILIKE :search OR r.description_ar ILIKE :search)`,
      );
      replacements.search = `%${filters.search}%`;
    }

    if (filters.type) {
      conditions.push('r.type = :type');
      replacements.type = filters.type;
    }

    if (filters.isPublished !== undefined) {
      conditions.push('r.is_published = :isPublished');
      replacements.isPublished = filters.isPublished;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::int AS total FROM public.releases r ${whereClause}`;
    const dataQuery = `
      SELECT
        r.id,
        r.version,
        r.date,
        r.type,
        r.title_en     AS "titleEn",
        r.title_ar     AS "titleAr",
        r.description_en AS "descriptionEn",
        r.description_ar AS "descriptionAr",
        r.changes,
        r.tour,
        r.is_published  AS "isPublished",
        r.created_by    AS "createdBy",
        r.created_at    AS "createdAt",
        r.updated_at    AS "updatedAt"
      FROM public.releases r
      ${whereClause}
      ORDER BY r.date DESC, r.created_at DESC
      LIMIT :limit OFFSET :offset`;

    replacements.limit = limit;
    replacements.offset = (page - 1) * limit;

    const [countResult, rows] = await Promise.all([
      sequelize.query<{ total: number }>(countQuery, { replacements, type: QueryTypes.SELECT }),
      sequelize.query<Record<string, unknown>>(dataQuery, {
        replacements,
        type: QueryTypes.SELECT,
      }),
    ]);

    return {
      rows,
      count: countResult[0]?.total ?? 0,
    };
  }

  async findPublished(page: number, limit: number) {
    return this.findAll(page, limit, { isPublished: true });
  }

  async findLatestPublished(): Promise<Record<string, unknown> | null> {
    const sequelize = this.getSequelize();

    const query = `
      SELECT
        r.id,
        r.version,
        r.date,
        r.type,
        r.title_en     AS "titleEn",
        r.title_ar     AS "titleAr",
        r.description_en AS "descriptionEn",
        r.description_ar AS "descriptionAr",
        r.changes,
        r.tour,
        r.is_published  AS "isPublished",
        r.created_at    AS "createdAt"
      FROM public.releases r
      WHERE r.is_published = true AND r.deleted_at IS NULL
      ORDER BY r.date DESC, r.created_at DESC
      LIMIT 1`;

    const rows = await sequelize.query<Record<string, unknown>>(query, {
      type: QueryTypes.SELECT,
    });

    return rows[0] ?? null;
  }

  async findById(id: string): Promise<Record<string, unknown>> {
    const sequelize = this.getSequelize();

    const query = `
      SELECT
        r.id,
        r.version,
        r.date,
        r.type,
        r.title_en     AS "titleEn",
        r.title_ar     AS "titleAr",
        r.description_en AS "descriptionEn",
        r.description_ar AS "descriptionAr",
        r.changes,
        r.tour,
        r.is_published  AS "isPublished",
        r.created_by    AS "createdBy",
        r.updated_by    AS "updatedBy",
        r.created_at    AS "createdAt",
        r.updated_at    AS "updatedAt"
      FROM public.releases r
      WHERE r.id = :id AND r.deleted_at IS NULL`;

    const rows = await sequelize.query<Record<string, unknown>>(query, {
      replacements: { id },
      type: QueryTypes.SELECT,
    });

    if (!rows[0]) throw new NotFoundException(`Release ${id} not found`);
    return rows[0];
  }

  async create(dto: CreateReleaseDto, userId?: string): Promise<Record<string, unknown>> {
    this.getSequelize();

    const existing = await Release.findOne({ where: { version: dto.version } });
    if (existing) throw new ConflictException(`Version ${dto.version} already exists`);

    const release = await Release.create({
      version: dto.version,
      date: dto.date,
      type: dto.type,
      titleEn: dto.titleEn,
      titleAr: dto.titleAr,
      descriptionEn: dto.descriptionEn,
      descriptionAr: dto.descriptionAr,
      changes: dto.changes,
      tour: dto.tour ?? null,
      isPublished: dto.isPublished ?? false,
      createdBy: userId ?? null,
    } as any);

    return this.findById(release.id);
  }

  async update(
    id: string,
    dto: UpdateReleaseDto,
    userId?: string,
  ): Promise<Record<string, unknown>> {
    this.getSequelize();

    const release = await Release.findByPk(id);
    if (!release || release.deletedAt) throw new NotFoundException(`Release ${id} not found`);

    if (dto.version && dto.version !== release.version) {
      const dup = await Release.findOne({ where: { version: dto.version } });
      if (dup && dup.id !== id)
        throw new ConflictException(`Version ${dto.version} already exists`);
    }

    await Release.update(
      {
        ...(dto.version !== undefined && { version: dto.version }),
        ...(dto.date !== undefined && { date: dto.date }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.titleEn !== undefined && { titleEn: dto.titleEn }),
        ...(dto.titleAr !== undefined && { titleAr: dto.titleAr }),
        ...(dto.descriptionEn !== undefined && { descriptionEn: dto.descriptionEn }),
        ...(dto.descriptionAr !== undefined && { descriptionAr: dto.descriptionAr }),
        ...(dto.changes !== undefined && { changes: dto.changes }),
        ...(dto.tour !== undefined && { tour: dto.tour }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        updatedBy: userId ?? null,
      } as any,
      { where: { id } },
    );

    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    this.getSequelize();

    const release = await Release.findByPk(id);
    if (!release || release.deletedAt) throw new NotFoundException(`Release ${id} not found`);

    await Release.update({ deletedAt: new Date() } as any, { where: { id } });
  }
}
