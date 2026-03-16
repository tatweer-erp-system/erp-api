import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { AdjustmentReason } from '../entities/adjustment-reason.entity';

@Injectable()
export class AdjustmentReasonsRepository extends BaseRepository<AdjustmentReason> {
  constructor() {
    super(AdjustmentReason, true);
  }
}
