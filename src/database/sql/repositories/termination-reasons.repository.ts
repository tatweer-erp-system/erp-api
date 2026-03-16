import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { TerminationReason } from '../entities/termination-reason.entity';

@Injectable()
export class TerminationReasonsRepository extends BaseRepository<TerminationReason> {
  constructor() {
    super(TerminationReason, true);
  }
}
