import { HijriUtil, HijriDate } from './hijri.util';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface HijriDateRange {
  startDate: HijriDate;
  endDate: HijriDate;
}

export class DateRangeUtil {
  static thisMonth(referenceDate: Date = new Date()): DateRange {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const end = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { startDate: start, endDate: end };
  }

  static lastMonth(referenceDate: Date = new Date()): DateRange {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0, 23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  static thisQuarter(referenceDate: Date = new Date()): DateRange {
    const quarterStart = Math.floor(referenceDate.getMonth() / 3) * 3;
    const start = new Date(referenceDate.getFullYear(), quarterStart, 1);
    const end = new Date(referenceDate.getFullYear(), quarterStart + 3, 0, 23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  static lastQuarter(referenceDate: Date = new Date()): DateRange {
    const currentQuarterStart = Math.floor(referenceDate.getMonth() / 3) * 3;
    const start = new Date(referenceDate.getFullYear(), currentQuarterStart - 3, 1);
    const end = new Date(referenceDate.getFullYear(), currentQuarterStart, 0, 23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  static thisYear(referenceDate: Date = new Date()): DateRange {
    const start = new Date(referenceDate.getFullYear(), 0, 1);
    const end = new Date(referenceDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  static lastYear(referenceDate: Date = new Date()): DateRange {
    const year = referenceDate.getFullYear() - 1;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  static customRange(startDate: Date, endDate: Date): DateRange {
    return { startDate, endDate };
  }

  /** Convert a Gregorian date range to Hijri */
  static toHijriRange(range: DateRange): HijriDateRange {
    return {
      startDate: HijriUtil.toHijri(range.startDate),
      endDate: HijriUtil.toHijri(range.endDate),
    };
  }
}
