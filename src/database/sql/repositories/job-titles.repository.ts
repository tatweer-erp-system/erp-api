import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { JobTitle } from '../entities/job-title.entity';

@Injectable()
export class JobTitlesRepository extends BaseRepository<JobTitle> {
  constructor() {
    super(JobTitle, true);
  }
}
