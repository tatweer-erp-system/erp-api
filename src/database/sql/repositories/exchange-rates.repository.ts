import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { ExchangeRate } from '../entities/exchange-rate.entity';

@Injectable()
export class ExchangeRatesRepository extends BaseRepository<ExchangeRate> {
  constructor() {
    super(ExchangeRate, false);
  }
}
