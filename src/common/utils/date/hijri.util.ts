/**
 * Hijri (Islamic) calendar utility
 * Uses the Umm al-Qura calendar approximation algorithm
 */

export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

export class HijriUtil {
  /**
   * Convert Gregorian date to Hijri date (approximation)
   * Based on the Kuwaiti algorithm
   */
  static toHijri(date: Date): HijriDate {
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();

    let jd =
      Math.floor((1461 * (y + 4800 + Math.floor((m - 13) / 12))) / 4) +
      Math.floor((367 * (m - 1 - 12 * Math.floor((m - 13) / 12))) / 12) -
      Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 13) / 12)) / 100)) / 4) +
      d -
      32075;

    jd = jd - 1948440 + 10632;
    const n = Math.floor((jd - 1) / 10631);
    jd = jd - 10631 * n + 354;

    const j =
      Math.floor((10985 - jd) / 5316) *
        Math.floor((50 * jd) / 17719) +
      Math.floor(jd / 5670) *
        Math.floor((43 * jd) / 15238);

    jd =
      jd -
      Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
      29;

    const hijriMonth = Math.floor((24 * jd) / 709);
    const hijriDay = jd - Math.floor((709 * hijriMonth) / 24);
    const hijriYear = 30 * n + j - 30;

    return { year: hijriYear, month: hijriMonth, day: hijriDay };
  }

  /**
   * Convert Hijri date to Gregorian date (approximation)
   */
  static toGregorian(hijri: HijriDate): Date {
    const { year: hy, month: hm, day: hd } = hijri;

    const jd =
      Math.floor((11 * hy + 3) / 30) +
      354 * hy +
      30 * hm -
      Math.floor((hm - 1) / 2) +
      hd +
      1948440 -
      385;

    const l = jd + 68569;
    const n = Math.floor((4 * l) / 146097);
    const l2 = l - Math.floor((146097 * n + 3) / 4);
    const i = Math.floor((4000 * (l2 + 1)) / 1461001);
    const l3 = l2 - Math.floor((1461 * i) / 4) + 31;
    const j = Math.floor((80 * l3) / 2447);
    const day = l3 - Math.floor((2447 * j) / 80);
    const l4 = Math.floor(j / 11);
    const month = j + 2 - 12 * l4;
    const year = 100 * (n - 49) + i + l4;

    return new Date(year, month - 1, day);
  }

  /**
   * Format Hijri date as string
   */
  static formatHijri(hijri: HijriDate, lang: 'en' | 'ar' = 'en'): string {
    const monthNamesEn = [
      '', 'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
      'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Shaaban',
      'Ramadan', 'Shawwal', 'Dhul-Qadah', 'Dhul-Hijjah',
    ];

    const monthNamesAr = [
      '', 'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
      'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
      'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
    ];

    const months = lang === 'ar' ? monthNamesAr : monthNamesEn;
    const pad = (n: number) => n.toString().padStart(2, '0');

    return `${pad(hijri.day)} ${months[hijri.month]} ${hijri.year}`;
  }
}
