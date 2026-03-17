import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiParam } from '@nestjs/swagger';
import { CompanySettingsService } from '../services/company-settings.service';
import { UpdateCompanySettingsDto } from '../dto/update-company-settings.dto';
import { UpdateBranchSettingsDto } from '../dto/update-branch-settings.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Settings - Company & Branch')
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CompanySettingsController {
  constructor(private readonly companySettingsService: CompanySettingsService) {}

  // ─── Company Settings ──────────────────────────────────────────────────

  @Get('company-settings')
  @Permissions('settings:view')
  @ApiOperation({ summary: 'Get current tenant company settings' })
  @ApiOkResponse({ description: 'Company settings' })
  getCompanySettings(@TenantId() tenantId: string) {
    return this.companySettingsService.getCompanySettings(tenantId);
  }

  @Put('company-settings')
  @Permissions('settings:manage')
  @ApiOperation({ summary: 'Update company settings (partial update)' })
  @ApiOkResponse({ description: 'Updated company settings' })
  updateCompanySettings(
    @TenantId() tenantId: string,
    @Body() dto: UpdateCompanySettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.companySettingsService.updateCompanySettings(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  // ─── Branch Settings ───────────────────────────────────────────────────

  @Get('branch-settings/:branchId')
  @Permissions('settings:view')
  @ApiOperation({ summary: 'Get branch settings as key-value pairs' })
  @ApiParam({ name: 'branchId', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Branch settings' })
  getBranchSettings(@TenantId() tenantId: string, @Param('branchId') branchId: string) {
    return this.companySettingsService.getBranchSettings(tenantId, branchId);
  }

  @Put('branch-settings/:branchId')
  @Permissions('settings:manage')
  @ApiOperation({ summary: 'Update branch settings (key-value upsert)' })
  @ApiParam({ name: 'branchId', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Updated branch settings' })
  updateBranchSettings(
    @TenantId() tenantId: string,
    @Param('branchId') branchId: string,
    @Body() dto: UpdateBranchSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.companySettingsService.updateBranchSettings(tenantId, branchId, dto, {
      userId: user.id,
      tenantId,
    });
  }
}
