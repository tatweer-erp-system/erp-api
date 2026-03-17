import { PaymentTermLineType } from '@/common/enums/accounting-new.enums';

export interface PaymentTermWithLines {
  id: string;
  tenantId: string;
  nameEn: string;
  nameAr: string;
  note: string | null;
  lines: PaymentTermLineView[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTermLineView {
  id: string;
  paymentTermId: string;
  sequence: number;
  type: PaymentTermLineType;
  value: number;
  days: number;
  dayOfMonth: number | null;
}
