import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { BranchSetting } from '../entities/branch-setting.entity';

@Injectable()
export class BranchSettingsRepository extends BaseRepository<BranchSetting> {
  constructor() {
    super(BranchSetting, true);
  }
}
