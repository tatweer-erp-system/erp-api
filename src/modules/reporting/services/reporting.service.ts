import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ReportingRepository } from '@/database/sql/repositories/reporting.repository';
import { QUEUE_REPORTS } from '@/infrastructure/queues/queue.constants';
import { ReportQueryDto } from '../dto/report-query.dto';
import { ExportReportDto } from '../dto/export-report.dto';
import { ReportResult } from '../interfaces/report.interface';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    private readonly reportingRepository: ReportingRepository,
    @InjectQueue(QUEUE_REPORTS) private readonly reportsQueue: Queue,
  ) {}

  async getSalesReport(tenantId: string, query: ReportQueryDto): Promise<ReportResult> {
    const dateFilter = this.buildDateFilter('po.createdAt', query);

    const salesByStatus = await this.reportingRepository.getSalesByStatus(tenantId, dateFilter);
    const salesSummary = await this.reportingRepository.getSalesSummary(tenantId, dateFilter);

    return {
      reportType: 'sales',
      generatedAt: new Date(),
      filters: query,
      data: salesByStatus,
      summary: salesSummary,
    };
  }

  async getInventoryReport(tenantId: string, query: ReportQueryDto): Promise<ReportResult> {
    const lowStock = await this.reportingRepository.getLowStockItems(tenantId);
    const stockSummary = await this.reportingRepository.getStockSummary(tenantId);

    return {
      reportType: 'inventory',
      generatedAt: new Date(),
      filters: query,
      data: lowStock,
      summary: stockSummary,
    };
  }

  async getHrReport(tenantId: string, query: ReportQueryDto): Promise<ReportResult> {
    const dateFilter = this.buildDateFilter('l.startDate', query);

    const byDept = await this.reportingRepository.getEmployeesByDepartment(tenantId);
    const leaveStats = await this.reportingRepository.getLeaveStats(tenantId, dateFilter);
    const employeeSummary = await this.reportingRepository.getEmployeeSummary(tenantId);

    return {
      reportType: 'hr',
      generatedAt: new Date(),
      filters: query,
      data: [...byDept, ...leaveStats],
      summary: employeeSummary,
    };
  }

  async getFinancialReport(tenantId: string, query: ReportQueryDto): Promise<ReportResult> {
    const dateFilter = this.buildDateFilter('createdAt', query);

    const revenue = await this.reportingRepository.getFinancialRevenue(tenantId, dateFilter);
    const monthlyTrend = await this.reportingRepository.getMonthlyTrend(tenantId, dateFilter);

    return {
      reportType: 'financial',
      generatedAt: new Date(),
      filters: query,
      data: monthlyTrend,
      summary: revenue,
    };
  }

  async getCrmReport(tenantId: string, query: ReportQueryDto): Promise<ReportResult> {
    const dateFilter = this.buildDateFilter('l.createdAt', query);

    const pipeline = await this.reportingRepository.getCrmPipeline(tenantId, dateFilter);
    const summary = await this.reportingRepository.getCrmSummary(tenantId, dateFilter);

    return {
      reportType: 'crm',
      generatedAt: new Date(),
      filters: query,
      data: pipeline,
      summary: summary,
    };
  }

  async getDashboard(tenantId: string) {
    const [employees, products, openLeads, openPurchaseOrders, activeProjects, pendingTasks] =
      await Promise.all([
        this.reportingRepository.getDashboardEmployeeCount(tenantId),
        this.reportingRepository.getDashboardProductCount(tenantId),
        this.reportingRepository.getDashboardOpenLeadsCount(tenantId),
        this.reportingRepository.getDashboardOpenPOsCount(tenantId),
        this.reportingRepository.getDashboardActiveProjectsCount(tenantId),
        this.reportingRepository.getDashboardPendingTasksCount(tenantId),
      ]);

    return {
      employees,
      products,
      openLeads,
      openPurchaseOrders,
      activeProjects,
      pendingTasks,
    };
  }

  async exportReport(tenantId: string, dto: ExportReportDto, userId: string) {
    const job = await this.reportsQueue.add(
      'export',
      {
        tenantId,
        reportType: dto.reportType,
        format: dto.format,
        filters: {
          startDate: dto.startDate,
          endDate: dto.endDate,
        },
        requestedBy: userId,
      },
      { attempts: 2 },
    );

    return { jobId: job.id, status: 'queued' };
  }

  private buildDateFilter(
    column: string,
    query: ReportQueryDto,
  ): { clause: string; replacements: Record<string, string> } {
    const parts: string[] = [];
    const replacements: Record<string, string> = {};

    if (query.startDate) {
      parts.push(`AND ${column} >= :startDate`);
      replacements.startDate = query.startDate;
    }
    if (query.endDate) {
      parts.push(`AND ${column} <= :endDate`);
      replacements.endDate = query.endDate;
    }

    return { clause: parts.join(' '), replacements };
  }
}
