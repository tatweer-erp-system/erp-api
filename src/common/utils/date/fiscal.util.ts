export interface FiscalYear {
  year: number;
  startDate: Date;
  endDate: Date;
}

export interface FiscalPeriod {
  year: number;
  period: number; // 1-12
  startDate: Date;
  endDate: Date;
}

export class FiscalUtil {
  /**
   * Get current fiscal year
   * Saudi fiscal year: January 1 – December 31 (Gregorian)
   */
  static getCurrentFiscalYear(referenceDate: Date = new Date(), fiscalYearStartMonth = 1): FiscalYear {
    const year = referenceDate.getMonth() + 1 >= fiscalYearStartMonth
      ? referenceDate.getFullYear()
      : referenceDate.getFullYear() - 1;

    const startDate = new Date(year, fiscalYearStartMonth - 1, 1);
    const endDate = new Date(year + 1, fiscalYearStartMonth - 1, 0); // last day of prev month next year

    return { year, startDate, endDate };
  }

  /**
   * Get current fiscal period (month within fiscal year)
   */
  static getCurrentFiscalPeriod(referenceDate: Date = new Date(), fiscalYearStartMonth = 1): FiscalPeriod {
    const fiscal = FiscalUtil.getCurrentFiscalYear(referenceDate, fiscalYearStartMonth);
    const monthIndex = referenceDate.getMonth();
    const startMonthIndex = fiscalYearStartMonth - 1;

    let period = monthIndex - startMonthIndex + 1;
    if (period <= 0) period += 12;

    const startDate = new Date(referenceDate.getFullYear(), monthIndex, 1);
    const endDate = new Date(referenceDate.getFullYear(), monthIndex + 1, 0);

    return { year: fiscal.year, period, startDate, endDate };
  }

  /**
   * Get date range for a fiscal year
   */
  static getFiscalYearDateRange(year: number, fiscalYearStartMonth = 1): { startDate: Date; endDate: Date } {
    const startDate = new Date(year, fiscalYearStartMonth - 1, 1);
    const endDate = new Date(year + 1, fiscalYearStartMonth - 1, 0);

    return { startDate, endDate };
  }
}
