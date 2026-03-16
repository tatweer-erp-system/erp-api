import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DiscountReason } from '../entities/discount-reason.entity';

@Injectable()
export class DiscountReasonsRepository extends BaseRepository<DiscountReason> {
  constructor() {
    super(DiscountReason, true);
  }
}
