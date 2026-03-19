import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PaymentNew } from '../entities/payment-new.entity';
import { PaymentStatusNew } from '@/common/enums/invoice.enums';

@Injectable()
export class PaymentsNewRepository extends BaseRepository<PaymentNew> {
  constructor() {
    super(PaymentNew, true);
  }

  async getSummary(
    tenantId: string,
    filters: {
      paymentType?: string;
      status?: string;
      partnerId?: string;
      branchId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const sequelize = this.getSequelize();
    const replacements: Record<string, unknown> = { tenantId };
    let filter = '';

    if (filters.paymentType) {
      filter += ` AND p."paymentType" = :paymentType`;
      replacements.paymentType = filters.paymentType;
    }
    if (filters.status) {
      filter += ` AND p.status = :status`;
      replacements.status = filters.status;
    }
    if (filters.partnerId) {
      filter += ` AND p."partnerId" = :partnerId`;
      replacements.partnerId = filters.partnerId;
    }
    if (filters.branchId) {
      filter += ` AND p."branchId" = :branchId`;
      replacements.branchId = filters.branchId;
    }
    if (filters.dateFrom) {
      filter += ` AND p."paymentDate" >= :dateFrom`;
      replacements.dateFrom = filters.dateFrom;
    }
    if (filters.dateTo) {
      filter += ` AND p."paymentDate" <= :dateTo`;
      replacements.dateTo = filters.dateTo;
    }

    const [rows] = await sequelize.query(
      `SELECT
         COUNT(*)::int AS "totalRecords",
         COUNT(*) FILTER (WHERE p.status = :statusDraft)::int AS "totalDraft",
         COUNT(*) FILTER (WHERE p.status = :statusPosted)::int AS "totalPosted",
         COUNT(*) FILTER (WHERE p.status = :statusCancelled)::int AS "totalCancelled",
         COALESCE(SUM(p."amountBase"), 0)::numeric(15,2) AS "totalAmount"
       FROM payments p
       WHERE p."tenantId" = :tenantId AND p."deletedAt" IS NULL ${filter}`,
      {
        replacements: {
          ...replacements,
          statusDraft: PaymentStatusNew.DRAFT,
          statusPosted: PaymentStatusNew.POSTED,
          statusCancelled: PaymentStatusNew.CANCELLED,
        },
      },
    );

    const row = (rows as any[])[0] ?? {};
    return {
      totalRecords: row.totalRecords ?? 0,
      totalDraft: row.totalDraft ?? 0,
      totalPosted: row.totalPosted ?? 0,
      totalCancelled: row.totalCancelled ?? 0,
      totalAmount: parseFloat(row.totalAmount ?? '0'),
    };
  }
}
