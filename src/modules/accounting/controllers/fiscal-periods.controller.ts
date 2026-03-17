import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { FiscalPeriodsService } from '../services/fiscal-periods.service';
import { CreateFiscalPeriodDto } from '../dto/create-fiscal-period.dto';
import { UpdateFiscalPeriodDto } from '../dto/update-fiscal-period.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Accounting - Fiscal Periods')
@Controller('accounting/periods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FiscalPeriodsController {
  constructor(private readonly fiscalPeriodsService: FiscalPeriodsService) {}

  @Get()
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'List all fiscal periods' })
  @ApiOkResponse({ description: 'List of fiscal periods' })
  findAll(@TenantId() tenantId: string) {
    return this.fiscalPeriodsService.findAll(tenantId);
  }

  @Get('lock-date')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Get the current fiscal lock date' })
  @ApiOkResponse({ description: 'Fiscal lock date or null' })
  async getFiscalLockDate(@TenantId() tenantId: string) {
    const lockDate = await this.fiscalPeriodsService.getFiscalLockDate(tenantId);
    return { fiscalLockDate: lockDate };
  }

  @Get(':id')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Get fiscal period by ID' })
  @ApiParam({ name: 'id', type: 'integer' })
  @ApiOkResponse({ description: 'Fiscal period details' })
  findById(@TenantId() tenantId: string, @Param('id', ParseIntPipe) id: number) {
    return this.fiscalPeriodsService.findById(tenantId, id);
  }

  @Post()
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Create a new fiscal period' })
  @ApiCreatedResponse({ description: 'Fiscal period created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateFiscalPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fiscalPeriodsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Patch(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Update fiscal period' })
  @ApiParam({ name: 'id', type: 'integer' })
  @ApiOkResponse({ description: 'Fiscal period updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFiscalPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fiscalPeriodsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Post(':id/close')
  @Permissions('accounting:close')
  @ApiOperation({ summary: 'Close a fiscal period' })
  @ApiParam({ name: 'id', type: 'integer' })
  @ApiOkResponse({ description: 'Fiscal period closed' })
  close(
    @TenantId() tenantId: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fiscalPeriodsService.close(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/reopen')
  @Permissions('accounting:close')
  @ApiOperation({ summary: 'Reopen a closed fiscal period' })
  @ApiParam({ name: 'id', type: 'integer' })
  @ApiOkResponse({ description: 'Fiscal period reopened' })
  reopen(
    @TenantId() tenantId: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fiscalPeriodsService.reopen(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/lock')
  @Permissions('accounting:close')
  @ApiOperation({ summary: 'Lock a fiscal period permanently' })
  @ApiParam({ name: 'id', type: 'integer' })
  @ApiOkResponse({ description: 'Fiscal period locked' })
  lock(
    @TenantId() tenantId: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fiscalPeriodsService.lock(tenantId, id, { userId: user.id, tenantId });
  }

  @Post('lock-date')
  @Permissions('accounting:close')
  @ApiOperation({ summary: 'Set the fiscal lock date — prevents posting on or before this date' })
  @ApiOkResponse({ description: 'Fiscal lock date set' })
  setFiscalLockDate(
    @TenantId() tenantId: string,
    @Body('lockDate') lockDate: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fiscalPeriodsService.setFiscalLockDate(tenantId, lockDate, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('lock-date')
  @Permissions('accounting:close')
  @ApiOperation({ summary: 'Clear the fiscal lock date' })
  @ApiOkResponse({ description: 'Fiscal lock date cleared' })
  clearFiscalLockDate(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fiscalPeriodsService.clearFiscalLockDate(tenantId, {
      userId: user.id,
      tenantId,
    });
  }
}
