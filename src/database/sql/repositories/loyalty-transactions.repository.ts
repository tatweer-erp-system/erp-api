import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyTransaction } from '@/database/sql/entities/loyalty-transaction.entity';

@Injectable()
export class LoyaltyTransactionsRepository {
  constructor(
    @InjectRepository(LoyaltyTransaction)
    private readonly repo: Repository<LoyaltyTransaction>,
  ) {}

  async findByAccount(
    accountId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: LoyaltyTransaction[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.repo
      .createQueryBuilder('t')
      .where('t.account_id = :accountId', { accountId })
      .orderBy('t.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit };
  }

  async create(
    data: Partial<LoyaltyTransaction>,
    ..._opts: unknown[]
  ): Promise<LoyaltyTransaction> {
    const entity = this.repo.create(data as LoyaltyTransaction);
    return this.repo.save(entity) as any;
  }

  async findByOrder(orderId: string): Promise<LoyaltyTransaction[]> {
    return this.repo.find({ where: { orderId } as any });
  }
}
