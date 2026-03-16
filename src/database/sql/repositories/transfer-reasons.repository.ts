import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { TransferReason } from '../entities/transfer-reason.entity';

@Injectable()
export class TransferReasonsRepository extends BaseRepository<TransferReason> {
  constructor() {
    super(TransferReason, true);
  }
}
