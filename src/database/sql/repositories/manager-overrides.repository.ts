import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { ManagerOverride } from '../entities/manager-override.entity';

@Injectable()
export class ManagerOverridesRepository extends BaseRepository<ManagerOverride> {
  constructor() {
    super(ManagerOverride, true);
  }
}
