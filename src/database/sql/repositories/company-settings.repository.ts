import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { CompanySetting } from '../entities/company-setting.entity';

@Injectable()
export class CompanySettingsRepository extends BaseRepository<CompanySetting> {
  constructor() {
    super(CompanySetting, true);
  }
}
