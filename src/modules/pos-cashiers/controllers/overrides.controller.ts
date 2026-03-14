import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OverridesService } from '../services/overrides.service';
import { RequestOverrideDto } from '../dto/request-override.dto';
import { ApproveOverrideDto } from '../dto/approve-override.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('POS - Manager Overrides')
@ApiBearerAuth()
@ModuleFeature('pos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos/overrides')
export class OverridesController {
  constructor(private readonly overridesService: OverridesService) {}

  @Post()
  @ApiOperation({ summary: 'Request a manager override' })
  @Permissions('pos:orders')
  create(
    @TenantId() tenantId: string,
    @Body() dto: RequestOverrideDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.overridesService.requestOverride(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a manager override with manager PIN' })
  @Permissions('pos:orders')
  @HttpCode(HttpStatus.OK)
  approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ApproveOverrideDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.overridesService.approveOverride(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List all manager overrides' })
  @Permissions('pos:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.overridesService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a manager override by ID' })
  @Permissions('pos:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.overridesService.findById(tenantId, id);
  }
}
