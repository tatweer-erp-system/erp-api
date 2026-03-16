import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GiftCardTransaction } from '@/database/sql/entities/gift-card-transaction.entity';

@Injectable()
export class GiftCardTransactionsRepository {
  constructor(
    @InjectRepository(GiftCardTransaction)
    private readonly repo: Repository<GiftCardTransaction>,
  ) {}

  async create(
    data: Partial<GiftCardTransaction>,
    ..._opts: unknown[]
  ): Promise<GiftCardTransaction> {
    const entity = this.repo.create(data as GiftCardTransaction);
    return this.repo.save(entity) as any;
  }

  async findByGiftCard(giftCardId: string): Promise<GiftCardTransaction[]> {
    return this.repo.find({
      where: { giftCardId } as any,
      order: { createdAt: 'DESC' },
    });
  }
}
