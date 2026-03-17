import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { CrmStage } from '../entities/crm-stage.entity';

@Injectable()
export class CrmStagesRepository extends BaseRepository<CrmStage> {
  constructor() {
    super(CrmStage, true);
  }
}
