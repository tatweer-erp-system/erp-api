import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { TaxGroup } from '../entities/tax-group.entity';

@Injectable()
export class TaxGroupsRepository extends BaseRepository<TaxGroup> {
  constructor() {
    super(TaxGroup, true);
  }
}
