export interface ZatcaConfig {
  vatNumber: string;
  sellerNameEn: string;
  sellerNameAr: string;
  streetEn: string;
  streetAr: string;
  buildingNumber: string;
  cityEn: string;
  cityAr: string;
  postalCode: string;
  districtEn: string;
  districtAr: string;
  countryCode: string;
  crNumber: string;
  privateKey: string;
  certificate: string;
  previousInvoiceHash: string;
  environment: 'sandbox' | 'production';
  apiSecret: string;
}

export interface QrFields {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  totalWithVat: string;
  vatAmount: string;
  xmlHash: string;
  signature: string;
  publicKey: string;
}

export interface ZatcaPortalResponse {
  reportingStatus?: string;
  clearanceStatus?: string;
  validationResults?: {
    status: string;
    infoMessages?: ZatcaMessage[];
    warningMessages?: ZatcaMessage[];
    errorMessages?: ZatcaMessage[];
  };
  clearedInvoice?: string;
}

export interface ZatcaMessage {
  type: string;
  code: string;
  category: string;
  message: string;
  status: string;
}

export interface ZatcaInvoiceData {
  id: string;
  orderNumber: string;
  uuid: string;
  issueDate: string;
  issueTime: string;
  invoiceTypeCode: string;
  invoiceTypeCodeName: string;
  transactionTypeCode: string;
  currency: string;
  invoiceCounter: number;
  previousInvoiceHash: string;
  notes: string | null;
  originalInvoiceId: string | null;
  seller: ZatcaPartyData;
  buyer: ZatcaPartyData | null;
  lines: ZatcaLineData[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxCategory: string;
  taxRate: number;
  taxExemptionCode: string | null;
  taxExemptionReason: string | null;
  supplyType: string;
}

export interface ZatcaPartyData {
  nameEn: string;
  nameAr: string;
  vatNumber: string;
  street: string;
  buildingNumber: string;
  city: string;
  postalCode: string;
  district: string;
  countryCode: string;
  crNumber?: string;
}

export interface ZatcaLineData {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  taxCategory: string;
}
