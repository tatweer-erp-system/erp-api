import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PayrollRun } from '../entities/payroll-run.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class PayrollRunsRepository extends BaseRepository<PayrollRun> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(PayrollRun, true);
  }
}
