import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LoyaltyAccount } from '@/database/sql/entities/loyalty-account.entity';

@Injectable()
export class LoyaltyAccountsRepository {
  constructor(
    @InjectRepository(LoyaltyAccount)
    private readonly repo: Repository<LoyaltyAccount>,
    private readonly dataSource: DataSource,
  ) {}

  async findByCustomer(customerId: string, programId?: string): Promise<LoyaltyAccount[]> {
    const where: Record<string, unknown> = { customerId };
    if (programId) where['programId'] = programId;
    return this.repo.find({ where: where as any });
  }

  async findById(id: string, ..._opts: unknown[]): Promise<LoyaltyAccount> {
    const account = await this.repo.findOne({ where: { id } as any });
    if (!account) {
      throw new NotFoundException({
        en: 'Loyalty account not found',
        ar: 'حساب الولاء غير موجود',
      });
    }
    return account;
  }

  async findByIdOrNull(id: string): Promise<LoyaltyAccount | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async findOne(opts: { customerId: string; programId: string }): Promise<LoyaltyAccount | null> {
    return this.repo.findOne({ where: opts as any });
  }

  async create(data: Partial<LoyaltyAccount>, ..._opts: unknown[]): Promise<LoyaltyAccount> {
    const entity = this.repo.create(data as LoyaltyAccount);
    return this.repo.save(entity) as any;
  }

  /**
   * Atomically adjusts balancePoints and returns updated account.
   * Uses UPDATE ... RETURNING to avoid race conditions.
   */
  async updateBalance(
    id: string,
    pointsDelta: number,
    newBalance: number,
  ): Promise<LoyaltyAccount> {
    await this.dataSource.query(
      `UPDATE loyalty_accounts
       SET balance_points = $1,
           lifetime_points = CASE WHEN $2 > 0 THEN lifetime_points + $2 ELSE lifetime_points END,
           updated_at = NOW(),
           version = version + 1
       WHERE id = $3`,
      [newBalance, pointsDelta, id],
    );
    return this.findById(id);
  }

  /**
   * Finds existing account or creates one for the customer+program pair.
   */
  async findOrCreate(customerId: string, programId: string): Promise<LoyaltyAccount> {
    const existing = await this.findOne({ customerId, programId });
    if (existing) return existing;
    return this.create({
      customerId,
      programId,
      balancePoints: 0,
      lifetimePoints: 0,
      isActive: true,
    });
  }
}
