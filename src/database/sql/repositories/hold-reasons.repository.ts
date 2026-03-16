import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { HoldReason } from '../entities/hold-reason.entity';

@Injectable()
export class HoldReasonsRepository extends BaseRepository<HoldReason> {
  constructor() {
    super(HoldReason, true);
  }
}
