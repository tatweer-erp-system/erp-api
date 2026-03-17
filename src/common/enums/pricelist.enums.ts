export enum PricelistDiscountPolicy {
  INCLUDE_IN_PRICE = 'include_in_price',
  DISCOUNT_ON_SALE = 'discount_on_sale',
}

export enum PricelistApplyOn {
  ALL = 'all',
  CATEGORY = 'category',
  PRODUCT = 'product',
}

export enum PricelistComputation {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
  FORMULA = 'formula',
}

export enum DownPaymentType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}
