import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Voucher } from '../entities/voucher.entity';

@Injectable()
export class VouchersRepository extends BaseRepository<Voucher> {
  constructor() {
    super(Voucher, true);
  }
}
