import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalPeriod } from '@/database/sql/entities/fiscal-period.entity';

@Injectable()
export class FiscalPeriodsRepository {
  constructor(@InjectRepository(FiscalPeriod) private readonly repo: Repository<FiscalPeriod>) {}

  async findAll() {
    return this.repo
      .createQueryBuilder('fp')
      .where('fp.deleted_at IS NULL')
      .orderBy('fp.start_date', 'DESC')
      .getMany();
  }

  async findById(id: string, ..._opts: any[]): Promise<FiscalPeriod> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) {
      throw new NotFoundException({
        en: 'Fiscal period not found',
        ar: 'الفترة المالية غير موجودة',
      });
    }
    return e;
  }

  async findCurrent(): Promise<FiscalPeriod | null> {
    const today = new Date();
    return this.repo
      .createQueryBuilder('fp')
      .where('fp.deleted_at IS NULL')
      .andWhere('fp.start_date <= :d', { d: today })
      .andWhere('fp.end_date >= :d', { d: today })
      .andWhere("fp.status = 'open'")
      .getOne();
  }

  async create(data: Partial<FiscalPeriod>, ..._opts: any[]): Promise<FiscalPeriod> {
    const entity = this.repo.create(data as unknown as FiscalPeriod);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<FiscalPeriod>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<FiscalPeriod> {
    const e = await this.findById(id);
    const data: Partial<FiscalPeriod> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findByIdAndTenant(...args: any[]): Promise<any> {
    return this.findById(String(args[0]));
  }
  async findByTenant(..._args: any[]): Promise<any[]> {
    return [];
  }
  async findPeriodForDate(..._args: any[]): Promise<any> {
    return null;
  }
  async getDraftEntryNumbers(..._args: any[]): Promise<any[]> {
    return [];
  }
}
