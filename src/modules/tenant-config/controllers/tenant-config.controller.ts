import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { TenantConfigService } from '../services/tenant-config.service';
import { UpdateGeneralConfigDto } from '../dto/update-general-config.dto';
import { UpdateAccountingConfigDto } from '../dto/update-accounting-config.dto';
import { UpdateHrConfigDto } from '../dto/update-hr-config.dto';
import { UpdatePosConfigDto } from '../dto/update-pos-config.dto';
import { UpdateZatcaConfigDto } from '../dto/update-zatca-config.dto';

@ApiTags('Tenant Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('config')
export class TenantConfigController {
  constructor(private readonly configService: TenantConfigService) {}

  // ─── Read All ──────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get all config groups combined' })
  getAll(@TenantId() tenantId: string) {
    return this.configService.getAll(tenantId);
  }

  // ─── General ───────────────────────────────────────────────────────────────

  @Get('general')
  @ApiOperation({ summary: 'Get general configuration' })
  getGeneral(@TenantId() tenantId: string) {
    return this.configService.getGeneral(tenantId);
  }

  @Patch('general')
  @ApiOperation({ summary: 'Update general configuration' })
  @Permissions('settings:manage')
  updateGeneral(@TenantId() tenantId: string, @Body() dto: UpdateGeneralConfigDto) {
    return this.configService.updateGeneral(tenantId, dto);
  }

  // ─── Accounting ────────────────────────────────────────────────────────────

  @Get('accounting')
  @ApiOperation({ summary: 'Get accounting configuration' })
  getAccounting(@TenantId() tenantId: string) {
    return this.configService.getAccounting(tenantId);
  }

  @Patch('accounting')
  @ApiOperation({ summary: 'Update accounting configuration' })
  @Permissions('settings:manage')
  updateAccounting(@TenantId() tenantId: string, @Body() dto: UpdateAccountingConfigDto) {
    return this.configService.updateAccounting(tenantId, dto);
  }

  // ─── HR ────────────────────────────────────────────────────────────────────

  @Get('hr')
  @ApiOperation({ summary: 'Get HR configuration' })
  getHr(@TenantId() tenantId: string) {
    return this.configService.getHr(tenantId);
  }

  @Patch('hr')
  @ApiOperation({ summary: 'Update HR configuration' })
  @Permissions('settings:manage')
  updateHr(@TenantId() tenantId: string, @Body() dto: UpdateHrConfigDto) {
    return this.configService.updateHr(tenantId, dto);
  }

  // ─── POS ───────────────────────────────────────────────────────────────────

  @Get('pos')
  @ApiOperation({ summary: 'Get POS configuration' })
  getPos(@TenantId() tenantId: string) {
    return this.configService.getPos(tenantId);
  }

  @Patch('pos')
  @ApiOperation({ summary: 'Update POS configuration' })
  @Permissions('settings:manage')
  updatePos(@TenantId() tenantId: string, @Body() dto: UpdatePosConfigDto) {
    return this.configService.updatePos(tenantId, dto);
  }

  // ─── ZATCA ─────────────────────────────────────────────────────────────────

  @Get('zatca')
  @ApiOperation({ summary: 'Get ZATCA configuration (sensitive values masked)' })
  getZatca(@TenantId() tenantId: string) {
    return this.configService.getZatca(tenantId);
  }

  @Patch('zatca')
  @ApiOperation({ summary: 'Update ZATCA configuration' })
  @Permissions('settings:manage')
  updateZatca(@TenantId() tenantId: string, @Body() dto: UpdateZatcaConfigDto) {
    return this.configService.updateZatca(tenantId, dto);
  }
}
