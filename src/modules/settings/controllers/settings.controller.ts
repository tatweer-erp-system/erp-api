import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SettingsService } from '../services/settings.service';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';
import { TenantId } from '@/common/decorators/tenant.decorator';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  @ApiQuery({ name: 'group', required: false, description: 'Filter by group' })
  findAll(@TenantId() tenantId: string, @Query('group') group?: string) {
    if (group) {
      return this.settingsService.findByGroup(tenantId, group);
    }
    return this.settingsService.findAll(tenantId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update settings (bulk upsert)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  update(@TenantId() tenantId: string, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(tenantId, dto);
  }
}
