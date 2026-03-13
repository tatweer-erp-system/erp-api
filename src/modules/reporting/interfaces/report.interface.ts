export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  module?: string;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface ReportResult {
  reportType: string;
  generatedAt: Date;
  filters: ReportFilter;
  data: Record<string, unknown>[];
  summary?: Record<string, unknown>;
}

export interface ExportJob {
  reportType: string;
  format: 'pdf' | 'csv' | 'xlsx';
  filters: ReportFilter;
  userId: string;
  tenantSlug: string;
}

export interface ReportJobData {
  tenantSlug: string;
  reportType: string;
  filters: Record<string, unknown>;
  requestedBy: string;
  format: 'pdf' | 'csv';
}
