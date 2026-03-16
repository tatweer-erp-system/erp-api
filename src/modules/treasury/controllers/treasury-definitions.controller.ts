import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { TreasuryDefinitionsService } from '../services/treasury-definitions.service';
import { CreateTransferReasonDto } from '../dto/create-transfer-reason.dto';
import { UpdateTransferReasonDto } from '../dto/update-transfer-reason.dto';

@ApiTags('Treasury Definitions')
@Controller('treasury/definitions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('treasury')
export class TreasuryDefinitionsController {
  constructor(private readonly service: TreasuryDefinitionsService) {}

  @Get('transfer-reasons')
  @Permissions('treasury:view')
  @ApiOperation({ summary: 'List all transfer reasons' })
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.service.findAll(tenantId, pagination);
  }

  @Get('transfer-reasons/:id')
  @Permissions('treasury:view')
  @ApiOperation({ summary: 'Get transfer reason by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }

  @Post('transfer-reasons')
  @Permissions('treasury:create')
  @ApiOperation({ summary: 'Create a new transfer reason' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTransferReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Patch('transfer-reasons/:id')
  @Permissions('treasury:update')
  @ApiOperation({ summary: 'Update a transfer reason' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransferReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete('transfer-reasons/:id')
  @Permissions('treasury:delete')
  @ApiOperation({ summary: 'Soft delete a transfer reason' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
