import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TransfersService } from '../services/transfers.service';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Inventory - Transfers')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an internal stock transfer' })
  @Permissions('inventory:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transfersService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Stock transfers summary — aggregate counts' })
  @Permissions('inventory:view')
  getSummary(@TenantId() tenantId: string) {
    return this.transfersService.getSummary(tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List internal transfers' })
  @Permissions('inventory:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.transfersService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transfer by ID' })
  @Permissions('inventory:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.transfersService.findById(tenantId, id);
  }
}
