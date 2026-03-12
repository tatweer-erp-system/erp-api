import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@ApiBearerAuth()
export class AuditLogsController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs (superadmin, paginated)' })
  @ApiQuery({ name: 'tenantSlug', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in entity, action, or tenant slug',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filter by action (e.g. POST, PATCH, DELETE)',
  })
  @ApiQuery({
    name: 'entity',
    required: false,
    description: 'Filter by entity (e.g. tenants, admins)',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (default: createdAt)' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order: ASC or DESC (default: DESC)',
  })
  async findAll(
    @Query('tenantSlug') tenantSlug?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 20;
    const order = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sort = sortBy ?? 'createdAt';

    const filters = {
      tenantSlug,
      search,
      action,
      entity,
      userId,
      startDate,
      endDate,
      sortBy: sort,
      sortOrder: order as 'ASC' | 'DESC',
    };

    const { rows, count } = await this.auditService.findAllFiltered(p, l, filters);
    return {
      data: rows,
      meta: {
        page: p,
        limit: l,
        total: count,
        totalPages: Math.ceil(count / l),
      },
    };
  }
}
