import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingJournal } from '@/database/sql/entities/accounting-journal.entity';
import { JournalType } from '@/common/enums/accounting.enums';

@Injectable()
export class AccountingJournalsRepository {
  constructor(
    @InjectRepository(AccountingJournal) private readonly repo: Repository<AccountingJournal>,
  ) {}

  async findAll(journalType?: JournalType, isActive?: boolean) {
    const qb = this.repo.createQueryBuilder('j').where('j.deleted_at IS NULL');
    if (journalType) qb.andWhere('j.journal_type = :t', { t: journalType });
    if (isActive !== undefined) qb.andWhere('j.is_active = :a', { a: isActive });
    return qb.orderBy('j.name_en').getMany();
  }

  async findById(id: string, ..._opts: any[]): Promise<AccountingJournal> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) throw new NotFoundException({ en: 'Journal not found', ar: 'اليومية غير موجودة' });
    return e;
  }

  async create(data: Partial<AccountingJournal>, ..._opts: any[]): Promise<AccountingJournal> {
    const entity = this.repo.create(data as unknown as AccountingJournal);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<AccountingJournal>,
  ): Promise<AccountingJournal> {
    const e = await this.findById(id);
    if (e.version !== version) {
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    }
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async findForDropdown(journalTypeOrTenant?: any, ..._opts: any[]) {
    const journalType =
      typeof journalTypeOrTenant === 'string' && journalTypeOrTenant.length < 40
        ? journalTypeOrTenant
        : undefined;
    const qb = this.repo
      .createQueryBuilder('j')
      .select([
        'j.id',
        'j.code',
        'j.name_en AS "nameEn"',
        'j.name_ar AS "nameAr"',
        'j.journal_type AS "journalType"',
      ])
      .where('j.deleted_at IS NULL')
      .andWhere('j.is_active = true');
    if (journalType) qb.andWhere('j.journal_type = :t', { t: journalType });
    return qb.orderBy('j.name_en').getRawMany();
  }
}
