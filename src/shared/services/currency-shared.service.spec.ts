import { CurrencySharedService } from './currency-shared.service';

describe('CurrencySharedService', () => {
  let service: CurrencySharedService;
  let cacheService: Record<string, jest.Mock>;

  beforeEach(() => {
    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    service = new CurrencySharedService(cacheService as any);
  });

  // ─── convert() ────────────────────────────────────────────────────────

  describe('convert()', () => {
    it('should convert amount by multiplying with exchange rate', () => {
      const result = service.convert(100, 3.75, 'USD', 'SAR');

      expect(result.originalAmount.toNumber()).toBe(100);
      expect(result.convertedAmount.toNumber()).toBe(375);
      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('SAR');
      expect(result.exchangeRate.toNumber()).toBe(3.75);
    });

    it('should round converted amount to 2 decimal places', () => {
      // 100 * 3.7533 = 375.33
      const result = service.convert(100, 3.7533, 'USD', 'SAR');

      expect(result.convertedAmount.toNumber()).toBe(375.33);
    });

    it('should handle rate = 1 (same currency)', () => {
      const result = service.convert(250.5, 1, 'SAR', 'SAR');

      expect(result.convertedAmount.toNumber()).toBe(250.5);
    });

    it('should handle zero amount', () => {
      const result = service.convert(0, 3.75, 'USD', 'SAR');

      expect(result.convertedAmount.toNumber()).toBe(0);
    });

    it('should handle small fractional amounts', () => {
      const result = service.convert(0.01, 3.75, 'USD', 'SAR');

      // 0.01 * 3.75 = 0.0375, rounded to 0.04
      expect(result.convertedAmount.toNumber()).toBe(0.04);
    });

    it('should handle large amounts', () => {
      const result = service.convert(1000000, 3.75, 'USD', 'SAR');

      expect(result.convertedAmount.toNumber()).toBe(3750000);
    });
  });

  // ─── getExchangeRate() ────────────────────────────────────────────────

  describe('getExchangeRate()', () => {
    it('should calculate cross rate as toRate / fromRate', () => {
      // If SAR->base = 1, USD->base = 3.75
      // SAR to USD rate = 3.75 / 1 = 3.75
      const rate = service.getExchangeRate(1, 3.75);

      expect(rate).toBe(3.75);
    });

    it('should round to 6 decimal places', () => {
      // 1 / 3 = 0.333333...
      const rate = service.getExchangeRate(3, 1);

      expect(rate).toBe(0.333333);
    });

    it('should handle equal rates (returns 1)', () => {
      const rate = service.getExchangeRate(3.75, 3.75);

      expect(rate).toBe(1);
    });

    it('should handle inverse conversion', () => {
      // USD to SAR = 3.75, SAR to USD = 1/3.75
      const rate = service.getExchangeRate(3.75, 1);

      expect(rate).toBe(0.266667);
    });
  });

  // ─── formatAmount() ───────────────────────────────────────────────────

  describe('formatAmount()', () => {
    it('should format amount with currency code in English', () => {
      const result = service.formatAmount(1234.56, 'SAR', 'en');

      expect(result).toContain('SAR');
      expect(result).toContain('1,234.56');
    });

    it('should format amount in Arabic locale', () => {
      const result = service.formatAmount(1234.56, 'SAR', 'ar');

      expect(result).toContain('SAR');
    });

    it('should default to English locale', () => {
      const result = service.formatAmount(100, 'SAR');

      expect(result).toContain('SAR');
      expect(result).toContain('100.00');
    });

    it('should always show 2 decimal places', () => {
      const result = service.formatAmount(100, 'USD', 'en');

      expect(result).toContain('100.00');
    });
  });

  // ─── getCachedRates() ─────────────────────────────────────────────────

  describe('getCachedRates()', () => {
    it('should fetch rates from cache using correct key', async () => {
      const rates = { USD: 3.75, EUR: 4.1 };
      cacheService.get.mockResolvedValue(rates);

      const result = await service.getCachedRates('SAR');

      expect(cacheService.get).toHaveBeenCalledWith('exchange_rates:SAR');
      expect(result).toEqual(rates);
    });

    it('should return null when no cached rates exist', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.getCachedRates('SAR');

      expect(result).toBeNull();
    });
  });

  // ─── setCachedRates() ─────────────────────────────────────────────────

  describe('setCachedRates()', () => {
    it('should store rates in cache with correct key and TTL', async () => {
      const rates = { USD: 3.75 };

      await service.setCachedRates('SAR', rates);

      expect(cacheService.set).toHaveBeenCalledWith(
        'exchange_rates:SAR',
        rates,
        3600, // CACHE_TTL.exchangeRates
      );
    });
  });
});
