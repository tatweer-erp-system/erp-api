import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SystemSettingsService } from '../services/settings.service';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  @ApiQuery({ name: 'group', required: false, description: 'Filter by group' })
  findAll(@Query('group') group?: string) {
    return this.systemSettingsService.findAll(group);
  }

  @Patch()
  @ApiOperation({ summary: 'Update system settings (bulk upsert)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  update(@Body() dto: UpdateSettingsDto) {
    return this.systemSettingsService.updateSettings(dto);
  }
}
