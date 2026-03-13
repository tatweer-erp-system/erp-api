import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { TableSession } from '../entities/table-session.entity';

@Injectable()
export class TableSessionsRepository extends BaseRepository<TableSession> {
  constructor() {
    super(TableSession, false);
  }
}
