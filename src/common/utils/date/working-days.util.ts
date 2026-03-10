/**
 * Working days utility
 * Saudi weekend: Friday + Saturday
 */

const FRIDAY = 5;
const SATURDAY = 6;

export class WorkingDaysUtil {
  /** Check if a date is a working day (not Friday/Saturday) */
  static isWorkingDay(date: Date, holidays: Date[] = []): boolean {
    const day = date.getDay();
    if (day === FRIDAY || day === SATURDAY) return false;

    return !holidays.some(
      (h) =>
        h.getFullYear() === date.getFullYear() &&
        h.getMonth() === date.getMonth() &&
        h.getDate() === date.getDate(),
    );
  }

  /** Count working days between two dates (inclusive) */
  static getWorkingDaysBetween(startDate: Date, endDate: Date, holidays: Date[] = []): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      if (WorkingDaysUtil.isWorkingDay(current, holidays)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /** Add N working days to a date */
  static addWorkingDays(date: Date, days: number, holidays: Date[] = []): Date {
    const result = new Date(date);
    let added = 0;

    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (WorkingDaysUtil.isWorkingDay(result, holidays)) {
        added++;
      }
    }

    return result;
  }

  /** Subtract N working days from a date */
  static subtractWorkingDays(date: Date, days: number, holidays: Date[] = []): Date {
    const result = new Date(date);
    let subtracted = 0;

    while (subtracted < days) {
      result.setDate(result.getDate() - 1);
      if (WorkingDaysUtil.isWorkingDay(result, holidays)) {
        subtracted++;
      }
    }

    return result;
  }
}
