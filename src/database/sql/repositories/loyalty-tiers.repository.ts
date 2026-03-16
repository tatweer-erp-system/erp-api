import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyTier } from '@/database/sql/entities/loyalty-tier.entity';

@Injectable()
export class LoyaltyTiersRepository {
  constructor(
    @InjectRepository(LoyaltyTier)
    private readonly repo: Repository<LoyaltyTier>,
  ) {}

  async findByProgram(programId: string): Promise<LoyaltyTier[]> {
    return this.repo.find({
      where: { programId } as any,
      order: { sequence: 'ASC' },
    });
  }

  async findById(id: string): Promise<LoyaltyTier> {
    const tier = await this.repo.findOne({ where: { id } as any });
    if (!tier) {
      throw new NotFoundException({ en: 'Loyalty tier not found', ar: 'مستوى الولاء غير موجود' });
    }
    return tier;
  }

  async findByIdOrNull(id: string): Promise<LoyaltyTier | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async findOne(opts: { where: Partial<LoyaltyTier> }): Promise<LoyaltyTier | null> {
    return this.repo.findOne({ where: opts.where as any });
  }

  async create(data: Partial<LoyaltyTier>, ..._opts: unknown[]): Promise<LoyaltyTier> {
    const entity = this.repo.create(data as LoyaltyTier);
    return this.repo.save(entity) as any;
  }

  async update(id: string, data: Partial<LoyaltyTier>, ..._opts: unknown[]): Promise<LoyaltyTier> {
    const tier = await this.findById(id);
    Object.assign(tier, data);
    return this.repo.save(tier) as any;
  }

  async hardDelete(id: string, ..._opts: unknown[]): Promise<void> {
    await this.repo.delete(id);
  }

  /**
   * Returns tiers ordered by minPoints descending — used for tier upgrade checks.
   */
  async findAllByProgramDesc(programId: string): Promise<LoyaltyTier[]> {
    return this.repo
      .createQueryBuilder('t')
      .where('t.program_id = :programId', { programId })
      .orderBy('t.min_points', 'DESC')
      .getMany();
  }
}
