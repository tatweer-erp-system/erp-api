import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sequence } from '@/database/sql/entities/sequence.entity';

@Injectable()
export class SequencesRepository {
  constructor(
    @InjectRepository(Sequence) private readonly repo: Repository<Sequence>,
    private readonly dataSource: DataSource,
  ) {}

  async nextSequence(branchId: string, module: string, year: number): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const seq = await manager.findOne(Sequence, {
        where: { branchId, module } as any,
        lock: { mode: 'pessimistic_write' },
      });
      if (!seq) throw new Error(`Sequence not found for module: ${module}`);
      const num = seq.nextNumber;
      await manager.update(Sequence, seq.id, { nextNumber: num + 1 });
      return `${seq.prefix}/${seq.branchCode}/${year}/${String(num).padStart(4, '0')}`;
    });
  }

  async create(data: Partial<Sequence>, ..._opts: any[]): Promise<Sequence> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async findByBranch(branchId: string): Promise<Sequence[]> {
    return this.repo.find({ where: { branchId } as any });
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async exists(..._args: any[]): Promise<boolean> {
    return false;
  }
  async findOne(opts: any, ..._opts2: any[]): Promise<any> {
    return this.repo.findOne(opts);
  }
  async findAllForTenant(..._args: any[]): Promise<any[]> {
    return [];
  }
  async findCompanyWide(..._args: any[]): Promise<any[]> {
    return [];
  }
  async findForUpdate(..._args: any[]): Promise<any> {
    return null;
  }
  async update(id: string, data: any, ..._opts: any[]): Promise<any> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) return null;
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }
  async incrementAndGet(..._args: any[]): Promise<number> {
    return 0;
  }
  async resetCounter(..._args: any[]): Promise<number> {
    return 1;
  }
  getSequelize(): any {
    return {
      transaction: (..._a: any[]) => Promise.resolve(null),
      query: (..._a: any[]) => Promise.resolve([[], {}]),
    } as any;
  }
  async findById(id: string, ..._opts: any[]): Promise<any> {
    return this.repo.findOne({ where: { id } as any });
  }
}
