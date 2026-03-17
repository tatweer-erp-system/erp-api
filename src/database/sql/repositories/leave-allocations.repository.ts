import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { LeaveAllocation } from '../entities/leave-allocation.entity';

@Injectable()
export class LeaveAllocationsRepository extends BaseRepository<LeaveAllocation> {
  constructor() {
    super(LeaveAllocation, true);
  }
}
