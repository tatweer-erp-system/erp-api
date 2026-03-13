import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Currency } from '../entities/currency.entity';

@Injectable()
export class CurrenciesRepository extends BaseRepository<Currency> {
  constructor() {
    super(Currency, true);
  }
}
