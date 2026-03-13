import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { VoucherRedemption } from '../entities/voucher-redemption.entity';

@Injectable()
export class VoucherRedemptionsRepository extends BaseRepository<VoucherRedemption> {
  constructor() {
    super(VoucherRedemption, false);
  }
}
