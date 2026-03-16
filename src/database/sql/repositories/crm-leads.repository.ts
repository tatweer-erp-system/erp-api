import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmLead } from '@/database/sql/entities/crm-lead.entity';
import { CrmLeadStatus } from '@/common/enums/crm.enums';

@Injectable()
export class CrmLeadsRepository {
  constructor(
    @InjectRepository(CrmLead)
    private readonly repo: Repository<CrmLead>,
  ) {}

  async findAll(
    branchId: string,
    filters: {
      status?: CrmLeadStatus;
      stageId?: string;
      assignedTo?: string;
      search?: string;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('cl')
      .where('cl.deleted_at IS NULL')
      .andWhere('cl.branch_id = :b', { b: branchId });

    if (filters.status) qb.andWhere('cl.status = :s', { s: filters.status });
    if (filters.stageId) qb.andWhere('cl.stage_id = :st', { st: filters.stageId });
    if (filters.assignedTo) qb.andWhere('cl.assigned_to = :at', { at: filters.assignedTo });
    if (filters.search) {
      qb.andWhere(
        '(cl.title ILIKE :q OR cl.contact_name ILIKE :q OR cl.email ILIKE :q OR cl.phone ILIKE :q)',
        { q: `%${filters.search}%` },
      );
    }

    const result = await qb
      .orderBy('cl.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const data = result[0] as CrmLead[];
    const total = result[1] as number;

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<CrmLead> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) {
      throw new NotFoundException({ en: 'Lead not found', ar: 'العميل المحتمل غير موجود' });
    }
    return e;
  }

  async create(data: Partial<CrmLead>, ..._opts: any[]): Promise<CrmLead> {
    const entity = this.repo.create(data as CrmLead);
    return this.repo.save(entity) as unknown as Promise<CrmLead>;
  }

  async update(
    id: string,
    version: number,
    data: Partial<CrmLead>,
    ..._opts: any[]
  ): Promise<CrmLead> {
    const e = await this.findById(id);
    if (e.version !== version) {
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    }
    Object.assign(e, data);
    return this.repo.save(e) as unknown as Promise<CrmLead>;
  }

  async markWon(id: string): Promise<CrmLead> {
    const e = await this.findById(id);
    e.status = CrmLeadStatus.WON;
    e.wonAt = new Date();
    e.lostAt = null;
    e.lossReason = null;
    return this.repo.save(e) as unknown as Promise<CrmLead>;
  }

  async markLost(id: string, lossReason: string): Promise<CrmLead> {
    const e = await this.findById(id);
    e.status = CrmLeadStatus.LOST;
    e.lostAt = new Date();
    e.lossReason = lossReason;
    e.wonAt = null;
    return this.repo.save(e) as unknown as Promise<CrmLead>;
  }

  async moveToStage(id: string, stageId: string): Promise<CrmLead> {
    const e = await this.findById(id);
    e.stageId = stageId;
    return this.repo.save(e) as unknown as Promise<CrmLead>;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }
}
