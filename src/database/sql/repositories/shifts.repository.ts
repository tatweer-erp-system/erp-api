import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Shift } from '../entities/shift.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';

@Injectable()
export class ShiftsRepository extends BaseRepository<Shift> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Shift, true);
  }
}
