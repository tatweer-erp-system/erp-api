import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Tax } from '../entities/tax.entity';

@Injectable()
export class TaxesRepository extends BaseRepository<Tax> {
  constructor() {
    super(Tax, true);
  }
}
