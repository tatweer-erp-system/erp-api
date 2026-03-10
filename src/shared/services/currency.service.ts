import { Injectable, Logger } from '@nestjs/common';
import { CacheService, CACHE_TTL } from '@/infrastructure/cache/cache.service';
import { CurrencyUtil, ConversionResult } from '@/common/utils/financial/currency.util';
import { DecimalUtil } from '@/common/utils/math/decimal.util';

export interface ExchangeRates {
  [currencyCode: string]: number;
}

@Injectable()
export class CurrencySharedService {
  private readonly logger = new Logger(CurrencySharedService.name);

  constructor(private readonly cacheService: CacheService) {}

  convert(
    amount: number,
    exchangeRate: number,
    fromCurrency: string,
    toCurrency: string,
  ): ConversionResult {
    return CurrencyUtil.convertAmount(amount, exchangeRate, fromCurrency, toCurrency);
  }

  getExchangeRate(fromRate: number, toRate: number): number {
    return DecimalUtil.toNumber(CurrencyUtil.getExchangeRate(fromRate, toRate));
  }

  formatAmount(amount: number, currencyCode: string, locale: 'en' | 'ar' = 'en'): string {
    return CurrencyUtil.formatAmount(amount, currencyCode, locale);
  }

  async getCachedRates(baseCurrency: string): Promise<ExchangeRates | null> {
    const cacheKey = `exchange_rates:${baseCurrency}`;
    return this.cacheService.get<ExchangeRates>(cacheKey);
  }

  async setCachedRates(baseCurrency: string, rates: ExchangeRates): Promise<void> {
    const cacheKey = `exchange_rates:${baseCurrency}`;
    await this.cacheService.set(cacheKey, rates, CACHE_TTL.exchangeRates);
  }
}
