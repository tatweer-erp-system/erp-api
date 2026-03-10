import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class DecimalUtil {
  static toDecimal(value: number | string | Decimal): Decimal {
    return new Decimal(value);
  }

  static toNumber(value: Decimal): number {
    return value.toNumber();
  }

  static add(...values: (number | string | Decimal)[]): Decimal {
    return values.reduce<Decimal>((sum, val) => sum.plus(new Decimal(val)), new Decimal(0));
  }

  static subtract(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).minus(new Decimal(b));
  }

  static multiply(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).times(new Decimal(b));
  }

  static divide(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).dividedBy(new Decimal(b));
  }

  static roundHalfUp(value: number | string | Decimal, decimalPlaces = 2): Decimal {
    return new Decimal(value).toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
  }

  static isZero(value: number | string | Decimal): boolean {
    return new Decimal(value).isZero();
  }

  static isPositive(value: number | string | Decimal): boolean {
    return new Decimal(value).isPositive() && !new Decimal(value).isZero();
  }

  static isNegative(value: number | string | Decimal): boolean {
    return new Decimal(value).isNegative();
  }

  static max(...values: (number | string | Decimal)[]): Decimal {
    return Decimal.max(...values.map((v) => new Decimal(v)));
  }

  static min(...values: (number | string | Decimal)[]): Decimal {
    return Decimal.min(...values.map((v) => new Decimal(v)));
  }

  static percentage(value: number | string | Decimal, percent: number | string | Decimal): Decimal {
    return DecimalUtil.multiply(value, DecimalUtil.divide(percent, 100));
  }

  static sum(values: (number | string | Decimal)[]): Decimal {
    return DecimalUtil.add(...values);
  }
}
