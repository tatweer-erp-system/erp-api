import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { SalaryRule } from '../entities/salary-rule.entity';

@Injectable()
export class SalaryRulesRepository extends BaseRepository<SalaryRule> {
  constructor() {
    super(SalaryRule, true);
  }
}
