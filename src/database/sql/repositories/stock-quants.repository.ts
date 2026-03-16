import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockQuant } from '@/database/sql/entities/stock-quant.entity';

@Injectable()
export class StockQuantsRepository {
  constructor(@InjectRepository(StockQuant) private readonly repo: Repository<StockQuant>) {}

  async findByBranch(
    branchId: string,
    productId?: string,
    locationId?: string,
  ): Promise<StockQuant[]> {
    const qb = this.repo.createQueryBuilder('sq').where('sq.branch_id = :branchId', { branchId });

    if (productId) qb.andWhere('sq.product_id = :productId', { productId });
    if (locationId) qb.andWhere('sq.location_id = :locationId', { locationId });

    return qb.orderBy('sq.updated_at', 'DESC').getMany();
  }

  async findByProduct(productId: string): Promise<StockQuant[]> {
    return this.repo
      .createQueryBuilder('sq')
      .where('sq.product_id = :productId', { productId })
      .orderBy('sq.branch_id')
      .getMany();
  }

  async adjustQty(
    branchId: string,
    productId: string,
    locationId: string,
    delta: number,
    lotId: string | null = null,
  ): Promise<StockQuant> {
    const existing = await this.repo.findOne({
      where: { branchId, productId, locationId, lotId } as any,
    });

    let quant: StockQuant;
    if (!existing) {
      quant = this.repo.create({
        branchId,
        productId,
        locationId,
        lotId,
        qty: delta,
        reservedQty: 0,
        avgCost: 0,
      } as any) as unknown as StockQuant;
    } else {
      existing.qty = Number(existing.qty) + delta;
      quant = existing;
    }

    return this.repo.save(quant) as any;
  }

  async getOnHand(branchId: string, productId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('sq')
      .select('COALESCE(SUM(sq.qty), 0)', 'total')
      .where('sq.branch_id = :branchId', { branchId })
      .andWhere('sq.product_id = :productId', { productId })
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0');
  }
}
