import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { VoucherTypeConfig } from '../entities/voucher-type.entity';

@Injectable()
export class VoucherTypesRepository extends BaseRepository<VoucherTypeConfig> {
  constructor() {
    super(VoucherTypeConfig, true);
  }
}
