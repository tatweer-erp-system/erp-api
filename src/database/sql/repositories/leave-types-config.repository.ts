import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { LeaveTypeConfig } from '../entities/leave-type-config.entity';

@Injectable()
export class LeaveTypesConfigRepository extends BaseRepository<LeaveTypeConfig> {
  constructor() {
    super(LeaveTypeConfig, true);
  }
}
