import { Injectable } from '@nestjs/common';
import { HijriUtil, HijriDate } from '@/common/utils/date/hijri.util';
import { FiscalUtil, FiscalYear, FiscalPeriod } from '@/common/utils/date/fiscal.util';
import { WorkingDaysUtil } from '@/common/utils/date/working-days.util';
import { DateRangeUtil, DateRange, HijriDateRange } from '@/common/utils/date/date-range.util';

@Injectable()
export class DateSharedService {
  // Hijri
  toHijri(date: Date): HijriDate {
    return HijriUtil.toHijri(date);
  }

  toGregorian(hijri: HijriDate): Date {
    return HijriUtil.toGregorian(hijri);
  }

  formatHijri(hijri: HijriDate, locale: 'en' | 'ar' = 'en'): string {
    return HijriUtil.formatHijri(hijri, locale);
  }

  // Fiscal
  getCurrentFiscalYear(referenceDate?: Date, fiscalStartMonth?: number): FiscalYear {
    return FiscalUtil.getCurrentFiscalYear(referenceDate, fiscalStartMonth);
  }

  getCurrentFiscalPeriod(referenceDate?: Date, fiscalStartMonth?: number): FiscalPeriod {
    return FiscalUtil.getCurrentFiscalPeriod(referenceDate, fiscalStartMonth);
  }

  getFiscalYearDateRange(year: number, fiscalStartMonth?: number): DateRange {
    return FiscalUtil.getFiscalYearDateRange(year, fiscalStartMonth);
  }

  // Working days
  isWorkingDay(date: Date, holidays: Date[] = []): boolean {
    return WorkingDaysUtil.isWorkingDay(date, holidays);
  }

  getWorkingDaysBetween(start: Date, end: Date, holidays: Date[] = []): number {
    return WorkingDaysUtil.getWorkingDaysBetween(start, end, holidays);
  }

  addWorkingDays(start: Date, days: number, holidays: Date[] = []): Date {
    return WorkingDaysUtil.addWorkingDays(start, days, holidays);
  }

  // Date ranges
  thisMonth(): DateRange {
    return DateRangeUtil.thisMonth();
  }

  lastMonth(): DateRange {
    return DateRangeUtil.lastMonth();
  }

  thisQuarter(): DateRange {
    return DateRangeUtil.thisQuarter();
  }

  lastQuarter(): DateRange {
    return DateRangeUtil.lastQuarter();
  }

  thisYear(): DateRange {
    return DateRangeUtil.thisYear();
  }

  lastYear(): DateRange {
    return DateRangeUtil.lastYear();
  }

  customRange(start: Date, end: Date): DateRange {
    return DateRangeUtil.customRange(start, end);
  }

  toHijriRange(range: DateRange): HijriDateRange {
    return DateRangeUtil.toHijriRange(range);
  }
}
