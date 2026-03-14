import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { AuditLogQueryService } from '../services/audit-log-query.service';
import { AuditLogFiltersDto } from '../dto/audit-log-filters.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditLogsQueryController {
  constructor(private readonly auditLogQueryService: AuditLogQueryService) {}

  @Get('entity/:entity/:entityId')
  @ApiOperation({ summary: 'Get full change history for a specific entity record' })
  @Permissions('audit:read')
  getEntityHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLogQueryService.getEntityHistory(user.tenantSlug, entity, entityId);
  }

  @Get()
  @ApiOperation({ summary: 'List audit logs with filters (paginated)' })
  @Permissions('audit:read')
  list(@CurrentUser() user: AuthenticatedUser, @Query() filters: AuditLogFiltersDto) {
    return this.auditLogQueryService.list(user.tenantSlug, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single audit log entry by ID' })
  @Permissions('audit:read')
  findById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.auditLogQueryService.findById(user.tenantSlug, id);
  }
}
