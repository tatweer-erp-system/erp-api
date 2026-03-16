import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyProgram } from '@/database/sql/entities/loyalty-program.entity';
import { LoyaltyTier } from '@/database/sql/entities/loyalty-tier.entity';

@Injectable()
export class LoyaltyProgramsRepository {
  constructor(
    @InjectRepository(LoyaltyProgram)
    private readonly repo: Repository<LoyaltyProgram>,
    @InjectRepository(LoyaltyTier)
    private readonly tiersRepo: Repository<LoyaltyTier>,
  ) {}

  async findAll(isActive?: boolean): Promise<LoyaltyProgram[]> {
    const qb = this.repo.createQueryBuilder('p').where('p.deleted_at IS NULL');
    if (isActive !== undefined) {
      qb.andWhere('p.is_active = :isActive', { isActive });
    }
    return qb.orderBy('p.created_at', 'DESC').getMany();
  }

  async findById(id: string, ..._opts: unknown[]): Promise<LoyaltyProgram> {
    const program = await this.repo.findOne({ where: { id } as any });
    if (!program) {
      throw new NotFoundException({
        en: 'Loyalty program not found',
        ar: 'برنامج الولاء غير موجود',
      });
    }
    return program;
  }

  async findByIdOrNull(id: string): Promise<LoyaltyProgram | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async findWithTiers(id: string): Promise<LoyaltyProgram & { tiers: LoyaltyTier[] }> {
    const program = await this.findById(id);
    const tiers = await this.tiersRepo.find({
      where: { programId: id } as any,
      order: { sequence: 'ASC' },
    });
    return { ...program, tiers };
  }

  async create(data: Partial<LoyaltyProgram>, ..._opts: unknown[]): Promise<LoyaltyProgram> {
    const entity = this.repo.create(data as LoyaltyProgram);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<LoyaltyProgram>,
  ): Promise<LoyaltyProgram> {
    const program = await this.findById(id);
    if (program.version !== version) {
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    }
    Object.assign(program, data);
    return this.repo.save(program) as any;
  }

  async softDelete(id: string, ..._opts: unknown[]): Promise<void> {
    const program = await this.findById(id);
    await this.repo.softRemove(program);
  }
}
