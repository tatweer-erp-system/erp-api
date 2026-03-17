import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { SalaryStructure } from '../entities/salary-structure.entity';

@Injectable()
export class SalaryStructuresRepository extends BaseRepository<SalaryStructure> {
  constructor() {
    super(SalaryStructure, true);
  }
}
