import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { TrainingRecord } from '../entities/training-record.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class TrainingRecordsRepository extends BaseRepository<TrainingRecord> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(TrainingRecord, true);
  }
}
