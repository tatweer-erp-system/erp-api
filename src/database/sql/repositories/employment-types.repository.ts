import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { EmploymentTypeConfig } from '../entities/employment-type.entity';

@Injectable()
export class EmploymentTypesRepository extends BaseRepository<EmploymentTypeConfig> {
  constructor() {
    super(EmploymentTypeConfig, true);
  }
}
