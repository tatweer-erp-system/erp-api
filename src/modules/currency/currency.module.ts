import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from '@/database/sql/entities/currency.entity';
import { ExchangeRate } from '@/database/sql/entities/exchange-rate.entity';
import { CurrenciesRepository } from '@/database/sql/repositories/currencies.repository';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Currency, ExchangeRate])],
  controllers: [CurrencyController],
  providers: [CurrencyService, CurrenciesRepository],
  exports: [CurrencyService, CurrenciesRepository],
})
export class CurrencyModule {}
