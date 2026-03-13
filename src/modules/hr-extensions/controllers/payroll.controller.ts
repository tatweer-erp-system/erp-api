import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PayrollService } from '../services/payroll.service';
import { CreatePayrollRunDto } from '../dto/create-payroll-run.dto';
import { AddPayrollItemDto } from '../dto/add-payroll-item.dto';
import { PayrollReportQueryDto } from '../dto/payroll-report-query.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('HR - Payroll')
@Controller('hr/payroll')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('hr')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // ── Payroll Runs ─────────────────────────────────────────────────────────

  @Post('runs')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Create a new payroll run' })
  @ApiCreatedResponse({ description: 'Payroll run created' })
  createRun(
    @TenantId() tenantId: string,
    @Body() dto: CreatePayrollRunDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payrollService.createRun(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get('runs')
  @Permissions('hr:read')
  @ApiOperation({ summary: 'List payroll runs' })
  @ApiOkResponse({ description: 'Paginated list of payroll runs' })
  listRuns(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.payrollService.findAllRuns(tenantId, query);
  }

  @Get('reports')
  @Permissions('hr:read')
  @ApiOperation({ summary: 'Payroll reports — aggregated per employee in a date range' })
  @ApiOkResponse({ description: 'Payroll report data' })
  getReport(@TenantId() tenantId: string, @Query() query: PayrollReportQueryDto) {
    return this.payrollService.getReport(tenantId, query);
  }

  @Get('runs/:id')
  @Permissions('hr:read')
  @ApiOperation({ summary: 'Get payroll run by ID (includes items)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ description: 'Payroll run with items' })
  getRun(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.payrollService.findRunById(tenantId, id);
  }

  @Post('runs/:id/confirm')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Confirm payroll run (draft → confirmed)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ description: 'Payroll run confirmed' })
  confirmRun(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payrollService.confirmRun(tenantId, id, { userId: user.id, tenantId });
  }

  @Post('runs/:id/approve')
  @Permissions('hr:approve')
  @ApiOperation({ summary: 'Approve payroll run (confirmed → approved)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ description: 'Payroll run approved' })
  approveRun(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payrollService.approveRun(tenantId, id, { userId: user.id, tenantId });
  }

  @Post('runs/:id/mark-paid')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Mark payroll run as paid (approved → paid)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ description: 'Payroll run marked as paid' })
  markPaid(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payrollService.markPaid(tenantId, id, { userId: user.id, tenantId });
  }

  // ── Payroll Items ─────────────────────────────────────────────────────────

  @Post('runs/:id/items')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Add / upsert payroll item for an employee in a run' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiCreatedResponse({ description: 'Payroll item added' })
  addItem(
    @TenantId() tenantId: string,
    @Param('id') runId: string,
    @Body() dto: AddPayrollItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payrollService.addItem(tenantId, runId, dto, { userId: user.id, tenantId });
  }

  @Delete('runs/:id/items/:itemId')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Remove payroll item from a run' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'itemId', type: 'string' })
  @ApiNoContentResponse({ description: 'Payroll item removed' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @TenantId() tenantId: string,
    @Param('id') runId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payrollService.removeItem(tenantId, runId, itemId, { userId: user.id, tenantId });
  }
}
