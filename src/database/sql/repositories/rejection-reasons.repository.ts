import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { RejectionReason } from '../entities/rejection-reason.entity';

@Injectable()
export class RejectionReasonsRepository extends BaseRepository<RejectionReason> {
  constructor() {
    super(RejectionReason, true);
  }
}
