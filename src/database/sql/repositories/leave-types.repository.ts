import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { LeaveTypeEntity } from '../entities/leave-type.entity';

@Injectable()
export class LeaveTypesRepository extends BaseRepository<LeaveTypeEntity> {
  constructor() {
    super(LeaveTypeEntity, true);
  }
}
