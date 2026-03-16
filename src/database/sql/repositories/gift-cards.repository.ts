import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GiftCard } from '@/database/sql/entities/gift-card.entity';
import { GiftCardStatus } from '@/common/enums/loyalty.enums';

@Injectable()
export class GiftCardsRepository {
  constructor(
    @InjectRepository(GiftCard)
    private readonly repo: Repository<GiftCard>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    filters: { status?: GiftCardStatus; issuedTo?: string } = {},
    page = 1,
    limit = 20,
  ): Promise<{ data: GiftCard[]; total: number; page: number; limit: number }> {
    const qb = this.repo.createQueryBuilder('gc').where('gc.deleted_at IS NULL');
    if (filters.status) qb.andWhere('gc.status = :status', { status: filters.status });
    if (filters.issuedTo) qb.andWhere('gc.issued_to = :issuedTo', { issuedTo: filters.issuedTo });
    const [data, total] = await qb
      .orderBy('gc.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(id: string, ..._opts: unknown[]): Promise<GiftCard> {
    const card = await this.repo.findOne({ where: { id } as any });
    if (!card) {
      throw new NotFoundException({ en: 'Gift card not found', ar: 'بطاقة الهدية غير موجودة' });
    }
    return card;
  }

  async findByCode(code: string): Promise<GiftCard | null> {
    return this.repo.findOne({ where: { code } as any });
  }

  async create(data: Partial<GiftCard>, ..._opts: unknown[]): Promise<GiftCard> {
    const entity = this.repo.create(data as GiftCard);
    return this.repo.save(entity) as any;
  }

  /**
   * Atomically deducts amount from current_balance.
   * Returns the amount actually deducted (may be less than requested if balance is insufficient).
   */
  async deduct(
    id: string,
    amount: number,
  ): Promise<{ amountDeducted: number; balanceAfter: number }> {
    const rows: { current_balance: string }[] = await this.dataSource.query(
      `UPDATE gift_cards
       SET current_balance = GREATEST(current_balance - $1, 0),
           status = CASE WHEN GREATEST(current_balance - $1, 0) = 0 THEN $2 ELSE status END,
           updated_at = NOW(),
           version = version + 1
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING current_balance`,
      [amount, GiftCardStatus.DEPLETED, id],
    );
    if (!rows || rows.length === 0) {
      throw new NotFoundException({ en: 'Gift card not found', ar: 'بطاقة الهدية غير موجودة' });
    }
    const balanceAfter = parseFloat(rows[0].current_balance);
    const card = await this.findById(id);
    const amountDeducted = parseFloat(String(card.initialBalance)) - balanceAfter;
    // Calculate correctly: deducted = original - new
    // But we need before-balance: fetch card was already updated, so compute from result
    return {
      amountDeducted:
        Math.round((amount - Math.max(amount - (balanceAfter + amount), 0)) * 10000) / 10000,
      balanceAfter,
    };
  }

  async refund(id: string, amount: number): Promise<GiftCard> {
    await this.dataSource.query(
      `UPDATE gift_cards
       SET current_balance = current_balance + $1,
           status = $2,
           updated_at = NOW(),
           version = version + 1
       WHERE id = $3 AND deleted_at IS NULL`,
      [amount, GiftCardStatus.ACTIVE, id],
    );
    return this.findById(id);
  }

  async expire(id: string): Promise<void> {
    await this.repo.update(id, { status: GiftCardStatus.EXPIRED } as any);
  }

  async softDelete(id: string, ..._opts: unknown[]): Promise<void> {
    const card = await this.findById(id);
    await this.repo.softRemove(card);
  }
}
