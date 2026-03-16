import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '@/database/sql/entities/project.entity';
import { ProjectStatus } from '@/common/enums/project.enums';

@Injectable()
export class ProjectsRepository {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
  ) {}

  async findAllPaginated(
    tenantId: string,
    opts: {
      limit: number;
      offset: number;
      search?: string;
      status?: ProjectStatus;
      managerId?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<{ rows: Project[]; total: number }> {
    const qb = this.repo.createQueryBuilder('p').where('p.deleted_at IS NULL');

    if (opts.search) {
      qb.andWhere('(p.name_en ILIKE :q OR p.name_ar ILIKE :q)', {
        q: `%${opts.search}%`,
      });
    }
    if (opts.status) qb.andWhere('p.status = :status', { status: opts.status });
    if (opts.managerId) qb.andWhere('p.manager_id = :managerId', { managerId: opts.managerId });

    const order = opts.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy('p.created_at', order).skip(opts.offset).take(opts.limit);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async findOneById(tenantId: string, id: string): Promise<Project | null> {
    return this.repo.findOne({
      where: { id, deletedAt: null } as any,
    });
  }

  async insertProject(
    tenantId: string,
    data: {
      nameEn: string;
      nameAr: string;
      descriptionEn?: string | null;
      descriptionAr?: string | null;
      status: ProjectStatus;
      startDate?: string | null;
      endDate?: string | null;
      budget?: number | null;
      managerId?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const entity = this.repo.create({
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      descriptionEn: data.descriptionEn ?? null,
      descriptionAr: data.descriptionAr ?? null,
      status: data.status,
      startDate: data.startDate ? (new Date(data.startDate) as any) : null,
      endDate: data.endDate ? (new Date(data.endDate) as any) : null,
      budget: data.budget ?? null,
      managerId: data.managerId ?? null,
      createdBy: data.createdBy ?? null,
    });
    const saved = await this.repo.save(entity);
    return saved.id;
  }

  async updateProject(
    tenantId: string,
    id: string,
    _fields: string[],
    data: Record<string, unknown>,
  ): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) return;

    const allowed: (keyof Project)[] = [
      'nameEn',
      'nameAr',
      'descriptionEn',
      'descriptionAr',
      'managerId',
      'startDate',
      'endDate',
      'budget',
      'status',
      'progress',
      'updatedBy',
    ];

    for (const key of allowed) {
      if (key in data) {
        (entity as any)[key] = data[key];
      }
    }

    if (data.updatedBy !== undefined) entity.updatedBy = data.updatedBy as string;

    await this.repo.save(entity);
  }

  async softDeleteProject(tenantId: string, id: string, deletedBy: string | null): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) return;
    entity.updatedBy = deletedBy;
    await this.repo.softRemove(entity);
  }

  async findDropdown(
    tenantId: string,
    opts: { search?: string; limit: number },
  ): Promise<{ id: string; nameEn: string; nameAr: string }[]> {
    const qb = this.repo
      .createQueryBuilder('p')
      .select(['p.id', 'p.name_en', 'p.name_ar'])
      .where('p.deleted_at IS NULL')
      .orderBy('p.name_en', 'ASC')
      .take(opts.limit);

    if (opts.search) {
      qb.andWhere('(p.name_en ILIKE :q OR p.name_ar ILIKE :q)', {
        q: `%${opts.search}%`,
      });
    }

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      id: r.p_id,
      nameEn: r.p_name_en,
      nameAr: r.p_name_ar,
    }));
  }
}
