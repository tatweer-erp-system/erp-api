export interface VariantCombination {
  variantId: string;
  combinationName: string;
  priceExtra: number;
  attributeValues: VariantAttributeValue[];
}

export interface VariantAttributeValue {
  attributeValueId: string;
  valueNameEn: string;
  valueNameAr: string;
  attributeNameEn: string;
  attributeNameAr: string;
}

export interface GenerateVariantsResult {
  generatedCount: number;
  variants: {
    id: string;
    combinationName: string;
    priceExtra: number;
  }[];
}

export interface TemplateAttributeWithValues {
  id: string;
  productId: string;
  attributeId: string;
  attributeNameEn: string;
  attributeNameAr: string;
  displayType: string;
  sequence: number;
  values: TemplateAttributeValueDetail[];
}

export interface TemplateAttributeValueDetail {
  id: string;
  templateAttributeId: string;
  attributeValueId: string;
  valueNameEn: string;
  valueNameAr: string;
  htmlColor: string | null;
  priceExtra: number;
  isActive: boolean;
}
