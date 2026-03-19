import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import {
  InvoiceTypeNew,
  InvoiceStatusNew,
  InvoicePaymentStatus,
} from '@/common/enums/invoice.enums';

export interface AgingBucket {
  partnerId: string;
  partnerName: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

export interface AgingReportResult {
  reportType: 'aging';
  generatedAt: string;
  receivables: AgingBucket[];
  payables: AgingBucket[];
  summary: {
    totalReceivables: number;
    totalPayables: number;
    overdueReceivables: number;
    overduePayables: number;
  };
}

@Injectable()
export class AgingService {
  private readonly logger = new Logger(AgingService.name);

  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async getAgingReport(tenantId: string, asOfDate?: string): Promise<AgingReportResult> {
    const refDate = asOfDate ?? new Date().toISOString().split('T')[0];

    const [receivables, payables] = await Promise.all([
      this.getAgingBuckets(tenantId, InvoiceTypeNew.OUT_INVOICE, refDate),
      this.getAgingBuckets(tenantId, InvoiceTypeNew.IN_INVOICE, refDate),
    ]);

    const totalReceivables = receivables.reduce((sum, r) => sum + r.total, 0);
    const totalPayables = payables.reduce((sum, r) => sum + r.total, 0);
    const overdueReceivables = receivables.reduce(
      (sum, r) => sum + r.days31to60 + r.days61to90 + r.over90,
      0,
    );
    const overduePayables = payables.reduce(
      (sum, r) => sum + r.days31to60 + r.days61to90 + r.over90,
      0,
    );

    return {
      reportType: 'aging',
      generatedAt: new Date().toISOString(),
      receivables,
      payables,
      summary: {
        totalReceivables,
        totalPayables,
        overdueReceivables,
        overduePayables,
      },
    };
  }

  private async getAgingBuckets(
    tenantId: string,
    invoiceType: InvoiceTypeNew,
    refDate: string,
  ): Promise<AgingBucket[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [rows] = await sequelize.query(
      `SELECT
         i."partnerId",
         COALESCE(p."nameEn", '') AS "partnerName",
         COALESCE(SUM(
           CASE WHEN (:refDate::date - i."dueDate"::date) <= 30
                THEN i."amountResidual" ELSE 0 END
         ), 0) AS "current",
         COALESCE(SUM(
           CASE WHEN (:refDate::date - i."dueDate"::date) BETWEEN 1 AND 30
                THEN i."amountResidual" ELSE 0 END
         ), 0) AS "days1to30",
         COALESCE(SUM(
           CASE WHEN (:refDate::date - i."dueDate"::date) BETWEEN 31 AND 60
                THEN i."amountResidual" ELSE 0 END
         ), 0) AS "days31to60",
         COALESCE(SUM(
           CASE WHEN (:refDate::date - i."dueDate"::date) BETWEEN 61 AND 90
                THEN i."amountResidual" ELSE 0 END
         ), 0) AS "days61to90",
         COALESCE(SUM(
           CASE WHEN (:refDate::date - i."dueDate"::date) > 90
                THEN i."amountResidual" ELSE 0 END
         ), 0) AS "over90",
         COALESCE(SUM(i."amountResidual"), 0) AS "total"
       FROM invoices i
       JOIN partners p ON p.id = i."partnerId"
       WHERE i."tenantId" = :tenantId
         AND i."deletedAt" IS NULL
         AND i."invoiceType" = :invoiceType
         AND i.status = :postedStatus
         AND i."paymentStatus" IN (:notPaid, :partial)
         AND i."amountResidual" > 0
         AND i."dueDate" IS NOT NULL
       GROUP BY i."partnerId", p."nameEn"
       ORDER BY "total" DESC`,
      {
        replacements: {
          tenantId,
          invoiceType,
          refDate,
          postedStatus: InvoiceStatusNew.POSTED,
          notPaid: InvoicePaymentStatus.NOT_PAID,
          partial: InvoicePaymentStatus.PARTIAL,
        },
      },
    );

    return (rows as any[]).map((row) => ({
      partnerId: row.partnerId,
      partnerName: row.partnerName,
      current: parseFloat(String(row.current ?? '0')),
      days1to30: parseFloat(String(row.days1to30 ?? '0')),
      days31to60: parseFloat(String(row.days31to60 ?? '0')),
      days61to90: parseFloat(String(row.days61to90 ?? '0')),
      over90: parseFloat(String(row.over90 ?? '0')),
      total: parseFloat(String(row.total ?? '0')),
    }));
  }
}
