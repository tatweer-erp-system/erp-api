import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { CancellationReason } from '../entities/cancellation-reason.entity';

@Injectable()
export class CancellationReasonsRepository extends BaseRepository<CancellationReason> {
  constructor() {
    super(CancellationReason, true);
  }
}
