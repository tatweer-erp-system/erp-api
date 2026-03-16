import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalEntry } from '@/database/sql/entities/journal-entry.entity';
import { JournalLine } from '@/database/sql/entities/journal-line.entity';
import { JournalEntryStatus } from '@/common/enums/accounting.enums';

@Injectable()
export class JournalEntriesRepository {
  constructor(
    @InjectRepository(JournalEntry) private readonly repo: Repository<JournalEntry>,
    @InjectRepository(JournalLine) private readonly lineRepo: Repository<JournalLine>,
  ) {}

  async findAll(
    branchIdOrFilters: string | any,
    filters: { status?: JournalEntryStatus; journalId?: string } = {},
    page = 1,
    limit = 20,
  ) {
    const branchId =
      typeof branchIdOrFilters === 'string'
        ? branchIdOrFilters
        : (branchIdOrFilters?.branchId ?? '');
    if (typeof branchIdOrFilters === 'object' && branchIdOrFilters !== null) {
      page = branchIdOrFilters.page ?? page;
      limit = branchIdOrFilters.limit ?? limit;
    }
    const qb = this.repo
      .createQueryBuilder('je')
      .where('je.deleted_at IS NULL')
      .andWhere('je.branch_id = :b', { b: branchId });
    if (filters.status) qb.andWhere('je.status = :s', { s: filters.status });
    if (filters.journalId) qb.andWhere('je.journal_id = :j', { j: filters.journalId });
    const [data, total] = await qb
      .orderBy('je.date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<JournalEntry> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) {
      throw new NotFoundException({
        en: 'Journal entry not found',
        ar: 'قيد اليومية غير موجود',
      });
    }
    return e;
  }

  async findWithLines(id: string) {
    const entry = await this.findById(id);
    const lines = await this.lineRepo.find({
      where: { journalEntryId: id } as any,
      order: { sequence: 'ASC' },
    });
    return { ...entry, lines };
  }

  async create(
    data: Partial<JournalEntry>,
    linesOrOpts?: Partial<JournalLine>[] | any,
    ..._opts: any[]
  ): Promise<JournalEntry> {
    const lines: Partial<JournalLine>[] = Array.isArray(linesOrOpts) ? linesOrOpts : [];
    const created = this.repo.create(data as unknown as JournalEntry);
    const entry = await (this.repo.save(created) as any);
    if (lines.length) {
      const lineEntities = lines.map((l) =>
        this.lineRepo.create({ ...l, journalEntryId: entry.id } as unknown as JournalLine),
      );
      await this.lineRepo.save(lineEntities);
    }
    return entry;
  }

  async post(id: string, sequence: string): Promise<JournalEntry> {
    const e = await this.findById(id);
    e.status = JournalEntryStatus.POSTED;
    e.sequence = sequence;
    return this.repo.save(e) as any;
  }

  async cancel(id: string, ..._opts: any[]): Promise<JournalEntry> {
    const e = await this.findById(id);
    e.status = JournalEntryStatus.CANCELLED;
    return this.repo.save(e) as any;
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findByIdOrNull(...args: any[]): Promise<JournalEntry | null> {
    const id = args[args.length - 1];
    return this.repo.findOne({ where: { id } as any });
  }
  async findByIdWithLines(...args: any[]): Promise<any> {
    return this.findWithLines(args[args.length - 1]);
  }
  async update(id: string, data: Partial<JournalEntry>, ..._opts: any[]): Promise<JournalEntry> {
    const e = await this.findById(id);
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }
  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }
  async nextEntryNumber(..._args: any[]): Promise<string> {
    return '';
  }
  async createTransaction(..._args: any[]): Promise<any> {
    return null;
  }
  async rawQuery<T = any>(..._args: any[]): Promise<T> {
    return [] as unknown as T;
  }
}
