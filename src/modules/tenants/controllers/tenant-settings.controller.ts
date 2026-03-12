import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';
import { TenantSettingsService } from '../services/tenant-settings.service';
import { TenantApiKeysService } from '../services/tenant-api-keys.service';
import { TenantsService } from '../services/tenants.service';
import { UpdateTenantSettingsDto } from '../dto/update-tenant-settings.dto';
import { GenerateApiKeyDto } from '../dto/generate-api-key.dto';

@ApiTags('Tenant Settings')
@Controller('tenants/:tenantId')
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@ApiBearerAuth()
export class TenantSettingsController {
  constructor(
    private readonly tenantSettingsService: TenantSettingsService,
    private readonly tenantApiKeysService: TenantApiKeysService,
    private readonly tenantsService: TenantsService,
  ) {}

  // ── Settings endpoints ──────────────────────────────────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'Get tenant settings' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Tenant settings object' })
  getSettings(@Param('tenantId') tenantId: string) {
    return this.tenantSettingsService.getSettings(tenantId);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update tenant settings' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Updated tenant settings object' })
  updateSettings(@Param('tenantId') tenantId: string, @Body() dto: UpdateTenantSettingsDto) {
    return this.tenantSettingsService.updateSettings(tenantId, dto);
  }

  @Post('settings/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset tenant settings to defaults' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Default tenant settings object' })
  resetSettings(@Param('tenantId') tenantId: string) {
    return this.tenantSettingsService.resetSettings(tenantId);
  }

  // ── API Keys endpoints ──────────────────────────────────────────────────────

  @Get('api-keys')
  @ApiOperation({ summary: 'List API keys for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'List of API keys (masked)' })
  listApiKeys(@Param('tenantId') tenantId: string) {
    return this.tenantApiKeysService.listApiKeys(tenantId);
  }

  @Post('api-keys')
  @ApiOperation({ summary: 'Generate a new API key' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiResponse({ status: 201, description: 'Generated API key (raw key returned only once)' })
  async generateApiKey(@Param('tenantId') tenantId: string, @Body() dto: GenerateApiKeyDto) {
    const tenant = await this.tenantsService.findById(tenantId);
    return this.tenantApiKeysService.generateApiKey(tenantId, (tenant as any).slug, dto);
  }

  @Delete('api-keys/:keyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'keyId', description: 'API Key UUID' })
  @ApiResponse({ status: 204, description: 'API key revoked' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  revokeApiKey(@Param('tenantId') tenantId: string, @Param('keyId') keyId: string) {
    return this.tenantApiKeysService.revokeApiKey(tenantId, keyId);
  }
}
