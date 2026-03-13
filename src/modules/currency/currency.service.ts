import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { CurrenciesRepository } from '@/database/sql/repositories/currencies.repository';
import { ExchangeRatesRepository } from '@/database/sql/repositories/exchange-rates.repository';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { ConvertResult } from './interfaces/currency.interfaces';

@Injectable()
export class CurrencyService {
  constructor(
    private readonly currenciesRepository: CurrenciesRepository,
    private readonly exchangeRatesRepository: ExchangeRatesRepository,
  ) {}

  // ── Currencies ─────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateCurrencyDto, auditContext: AuditContext) {
    // If isBase is being set, clear any existing base currency first
    if (dto.isBase) {
      await this.currenciesRepository.bulkUpdate({
        where: { isBase: true },
        data: { isBase: false } as any,
        tenantId,
      });
    }

    return this.currenciesRepository.create(
      {
        code: dto.code.toUpperCase(),
        name: dto.name,
        symbol: dto.symbol,
        isBase: dto.isBase ?? false,
        isActive: dto.isActive ?? true,
        decimalPlaces: dto.decimalPlaces ?? 2,
      } as any,
      { tenantId, auditContext },
    );
  }

  async findAll(tenantId: string) {
    return this.currenciesRepository.findAllRaw({ tenantId, order: [['code', 'ASC']] });
  }

  async update(tenantId: string, id: string, dto: UpdateCurrencyDto, auditContext: AuditContext) {
    return this.currenciesRepository.update(id, dto as any, { tenantId, auditContext });
  }

  async setBase(tenantId: string, id: string, auditContext: AuditContext) {
    // Clear existing base flag on all other currencies for this tenant
    await this.currenciesRepository.bulkUpdate({
      where: { isBase: true },
      data: { isBase: false } as any,
      tenantId,
    });

    return this.currenciesRepository.update(id, { isBase: true } as any, {
      tenantId,
      auditContext,
    });
  }

  async getBaseCurrency(tenantId: string) {
    const base = await this.currenciesRepository.findOne({
      tenantId,
      where: { isBase: true, isActive: true },
    });
    if (!base) {
      throw new BadRequestException(`No base currency configured for tenant "${tenantId}"`);
    }
    return base;
  }

  // ── Exchange Rates ─────────────────────────────────────────────────────────

  async createRate(tenantId: string, dto: CreateExchangeRateDto, auditContext: AuditContext) {
    return this.exchangeRatesRepository.create(
      {
        tenantId,
        fromCurrencyId: dto.fromCurrencyId,
        toCurrencyId: dto.toCurrencyId,
        rate: dto.rate,
        rateDate: dto.rateDate,
        source: dto.source ?? 'manual',
      } as any,
      { bypassTenantScope: true },
    );
  }

  async getRate(
    tenantId: string,
    fromCurrencyId: string,
    toCurrencyId: string,
    date?: string,
  ): Promise<number> {
    if (fromCurrencyId === toCurrencyId) return 1;

    const rateDate = date ?? new Date().toISOString().split('T')[0];

    // Try exact date first
    const rateRow = await this.exchangeRatesRepository.findOne({
      where: { fromCurrencyId, toCurrencyId, rateDate, tenantId },
      bypassTenantScope: true,
    });

    if (rateRow) {
      return parseFloat(String(rateRow.rate));
    }

    // Fall back to most recent rate on or before the date
    const rows = await this.exchangeRatesRepository.rawQuery<{ rate: string }[]>(
      `SELECT rate FROM exchange_rates
       WHERE "tenantId" = :tenantId
         AND "fromCurrencyId" = :fromCurrencyId
         AND "toCurrencyId" = :toCurrencyId
         AND "rateDate" <= :rateDate
       ORDER BY "rateDate" DESC
       LIMIT 1`,
      { tenantId, fromCurrencyId, toCurrencyId, rateDate },
    );

    if (rows && rows.length > 0) {
      return parseFloat(rows[0].rate);
    }

    throw new BadRequestException(
      `No exchange rate found from currency "${fromCurrencyId}" to "${toCurrencyId}" on or before "${rateDate}"`,
    );
  }

  async getRateByQuery(tenantId: string, from?: string, to?: string, date?: string) {
    if (!from || !to) {
      throw new BadRequestException('Both "from" and "to" currency IDs are required');
    }
    const rate = await this.getRate(tenantId, from, to, date);
    return {
      fromCurrencyId: from,
      toCurrencyId: to,
      rate,
      date: date ?? new Date().toISOString().split('T')[0],
    };
  }

  async getRateHistory(tenantId: string, currencyId?: string) {
    if (!currencyId) {
      throw new BadRequestException('currencyId query parameter is required');
    }
    return this.exchangeRatesRepository.findAllRaw({
      where: {
        tenantId,
        fromCurrencyId: currencyId,
      },
      bypassTenantScope: true,
      order: [['rateDate', 'DESC']],
    });
  }

  // ── Conversion helpers ─────────────────────────────────────────────────────

  convert(amount: number, rate: number): number {
    return Math.round(amount * rate * 100) / 100;
  }

  async toBase(
    tenantId: string,
    amount: number,
    currencyId: string,
    date?: string,
  ): Promise<ConvertResult> {
    const base = await this.getBaseCurrency(tenantId);
    if (currencyId === base.id) {
      return { amount, rate: 1 };
    }
    const rate = await this.getRate(tenantId, currencyId, base.id, date);
    return { amount: this.convert(amount, rate), rate };
  }
}
