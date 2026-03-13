import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PosSession } from '../entities/pos-session.entity';

@Injectable()
export class PosSessionsRepository extends BaseRepository<PosSession> {
  constructor() {
    super(PosSession, true);
  }
}
