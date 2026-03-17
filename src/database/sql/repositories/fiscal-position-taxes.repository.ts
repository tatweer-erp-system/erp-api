import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { FiscalPositionTax } from '../entities/fiscal-position-tax.entity';

@Injectable()
export class FiscalPositionTaxesRepository extends BaseRepository<FiscalPositionTax> {
  constructor() {
    super(FiscalPositionTax, true);
  }
}
