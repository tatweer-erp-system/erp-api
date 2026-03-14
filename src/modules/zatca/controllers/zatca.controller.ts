import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ZatcaSharedService } from '@/shared/services/zatca-shared.service';
import { IssueCreditNoteDto } from '../dto/issue-invoice.dto';
import { SaveZatcaConfigDto } from '../dto/zatca-config.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('ZATCA')
@ApiBearerAuth()
@ModuleFeature('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('zatca')
export class ZatcaController {
  constructor(private readonly zatcaSharedService: ZatcaSharedService) {}

  @Post('invoices/:orderId/issue')
  @ApiOperation({ summary: 'Issue ZATCA invoice for a sales order' })
  @Permissions('zatca:manage')
  @HttpCode(HttpStatus.OK)
  issueInvoice(
    @TenantId() tenantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.zatcaSharedService.issueInvoice(tenantId, orderId);
  }

  @Post('invoices/:orderId/credit-note')
  @ApiOperation({ summary: 'Issue ZATCA credit note for a sales order' })
  @Permissions('zatca:manage')
  @HttpCode(HttpStatus.OK)
  issueCreditNote(
    @TenantId() tenantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: IssueCreditNoteDto,
  ) {
    return this.zatcaSharedService.issueCreditNote(
      tenantId,
      orderId,
      dto.refundAmount ?? 0,
    );
  }

  @Get('invoices/:orderId/xml')
  @ApiOperation({ summary: 'Download signed ZATCA XML for a sales order' })
  @Permissions('zatca:read')
  getSignedXml(
    @TenantId() tenantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.zatcaSharedService.getSignedXml(tenantId, orderId);
  }

  @Get('invoices/:orderId/qr')
  @ApiOperation({ summary: 'Get QR code for a simplified invoice' })
  @Permissions('zatca:read')
  getQrCode(
    @TenantId() tenantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.zatcaSharedService.getQrCode(tenantId, orderId);
  }

  @Post('config')
  @ApiOperation({ summary: 'Save ZATCA configuration settings' })
  @Permissions('zatca:manage')
  @HttpCode(HttpStatus.OK)
  saveConfig(
    @TenantId() tenantId: string,
    @Body() dto: SaveZatcaConfigDto,
  ) {
    const configData: Record<string, string> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined && value !== null) {
        configData[key] = String(value);
      }
    }
    return this.zatcaSharedService.saveConfig(tenantId, configData);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get ZATCA configuration settings' })
  @Permissions('zatca:read')
  getConfig(@TenantId() tenantId: string) {
    return this.zatcaSharedService.getConfig(tenantId);
  }

  @Post('onboarding/csr')
  @ApiOperation({ summary: 'Generate CSR for ZATCA onboarding' })
  @Permissions('zatca:manage')
  @HttpCode(HttpStatus.OK)
  generateCsr(@TenantId() tenantId: string) {
    // CSR generation placeholder — requires tenant-specific org details
    return { message: 'CSR generation endpoint — to be implemented with ZATCA SDK' };
  }

  @Post('onboarding/compliance-check')
  @ApiOperation({ summary: 'Run ZATCA compliance check' })
  @Permissions('zatca:manage')
  @HttpCode(HttpStatus.OK)
  complianceCheck(@TenantId() tenantId: string) {
    // Compliance check placeholder
    return { message: 'Compliance check endpoint — to be implemented with ZATCA SDK' };
  }
}
