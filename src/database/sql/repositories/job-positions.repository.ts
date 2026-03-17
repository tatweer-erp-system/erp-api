import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { JobPosition } from '../entities/job-position.entity';

@Injectable()
export class JobPositionsRepository extends BaseRepository<JobPosition> {
  constructor() {
    super(JobPosition, true);
  }
}
