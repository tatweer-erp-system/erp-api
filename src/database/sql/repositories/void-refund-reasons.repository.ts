import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { VoidRefundReason } from '../entities/void-refund-reason.entity';

@Injectable()
export class VoidRefundReasonsRepository extends BaseRepository<VoidRefundReason> {
  constructor() {
    super(VoidRefundReason, true);
  }
}
