import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoucherRedemption } from '@/database/sql/entities/voucher-redemption.entity';

@Injectable()
export class VoucherRedemptionsRepository {
  constructor(
    @InjectRepository(VoucherRedemption)
    private readonly repo: Repository<VoucherRedemption>,
  ) {}

  async create(data: Partial<VoucherRedemption>, ..._opts: unknown[]): Promise<VoucherRedemption> {
    const entity = this.repo.create(data as VoucherRedemption);
    return this.repo.save(entity) as any;
  }

  async count(opts: { where: Partial<VoucherRedemption> }): Promise<number> {
    return this.repo.count({ where: opts.where as any });
  }

  async findByVoucher(voucherId: string): Promise<VoucherRedemption[]> {
    return this.repo.find({ where: { voucherId } as any });
  }
}
