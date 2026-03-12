import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RevenueService } from '../services/revenue.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';

@ApiTags('Revenue (Backoffice)')
@Controller('reporting/revenue')
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@ApiBearerAuth()
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get backoffice dashboard stats (tenants, subscriptions, revenue)' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  getDashboardStats() {
    return this.revenueService.getDashboardStats();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get revenue summary KPIs (MRR, ARR, growth, churn)' })
  @ApiResponse({ status: 200, description: 'Revenue summary' })
  getSummary() {
    return this.revenueService.getSummary();
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly revenue data over time' })
  @ApiResponse({ status: 200, description: 'Monthly revenue data' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months (default: 12)' })
  getMonthlyRevenue(@Query('months') months?: string) {
    return this.revenueService.getMonthlyRevenue(parseInt(months ?? '12', 10));
  }

  @Get('by-plan')
  @ApiOperation({ summary: 'Get revenue breakdown by plan' })
  @ApiResponse({ status: 200, description: 'Revenue by plan' })
  getRevenueByPlan() {
    return this.revenueService.getRevenueByPlan();
  }

  @Get('top-tenants')
  @ApiOperation({ summary: 'Get top tenants by revenue' })
  @ApiResponse({ status: 200, description: 'Top tenants' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of tenants (default: 10)' })
  getTopTenants(@Query('limit') limit?: string) {
    return this.revenueService.getTopTenants(parseInt(limit ?? '10', 10));
  }
}
