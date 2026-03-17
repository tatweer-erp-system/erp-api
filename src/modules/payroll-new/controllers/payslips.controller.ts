import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { PayslipsService } from '../services/payslips.service';
import { PayslipFilterDto } from '../dto/payslip-filter.dto';
import { GeneratePayslipsDto } from '../dto/generate-payslips.dto';

@ApiTags('Payslips')
@Controller('payslips')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PayslipsController {
  constructor(private readonly payslipsService: PayslipsService) {}

  @Get()
  @Permissions('payroll:view')
  @ApiOperation({ summary: 'List payslips with filters' })
  @ApiOkResponse({ description: 'Paginated list of payslips' })
  findAll(@TenantId() tenantId: string, @Query() query: PayslipFilterDto) {
    return this.payslipsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('payroll:view')
  @ApiOperation({ summary: 'Get single payslip with lines' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Payslip details with lines' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.payslipsService.findById(tenantId, id);
  }

  @Post('generate')
  @Permissions('payroll:manage')
  @ApiOperation({ summary: 'Batch generate payslips for a period' })
  @ApiCreatedResponse({ description: 'Payslips generated' })
  generate(
    @TenantId() tenantId: string,
    @Body() dto: GeneratePayslipsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payslipsService.generate(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/compute')
  @Permissions('payroll:manage')
  @ApiOperation({ summary: 'Recompute payslip lines from structure or contract' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Payslip recomputed with lines' })
  compute(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payslipsService.compute(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/confirm')
  @Permissions('payroll:manage')
  @ApiOperation({ summary: 'Confirm a draft payslip' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Payslip confirmed' })
  confirm(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payslipsService.confirm(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/cancel')
  @Permissions('payroll:manage')
  @ApiOperation({ summary: 'Cancel a payslip' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Payslip cancelled' })
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payslipsService.cancel(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
