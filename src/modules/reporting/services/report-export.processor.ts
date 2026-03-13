import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PdfService } from '@/infrastructure/pdf/pdf.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { QUEUE_REPORTS } from '@/infrastructure/queues/queue.constants';
import { ReportJobData } from '../interfaces/report.interface';

@Processor(QUEUE_REPORTS)
export class ReportExportProcessor {
  private readonly logger = new Logger(ReportExportProcessor.name);

  constructor(
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
  ) {}

  @Process('export')
  async handleExport(job: Job<ReportJobData>): Promise<{ url: string }> {
    const { tenantSlug, reportType, format } = job.data;
    this.logger.log(`Exporting ${reportType} report for tenant ${tenantSlug}`);

    if (format === 'pdf') {
      const html = this.buildReportHtml(job.data);
      const buffer = await this.pdfService.generateFromHtml(html);
      const key = await this.storageService.upload(
        buffer,
        'application/pdf',
        `reports/${tenantSlug}`,
        `${reportType}-${Date.now()}.pdf`,
      );
      const url = await this.storageService.getSignedUrl(key, 3600);
      return { url };
    }

    return { url: '' };
  }

  private buildReportHtml(data: ReportJobData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>${data.reportType} Report</title></head>
        <body>
          <h1>${data.reportType} Report</h1>
          <p>Tenant: ${data.tenantSlug}</p>
          <p>Generated: ${new Date().toISOString()}</p>
        </body>
      </html>
    `;
  }
}
