import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogsRepository extends BaseRepository<AuditLog> {
  constructor() {
    super(AuditLog, false);
  }
}
