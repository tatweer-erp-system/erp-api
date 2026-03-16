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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { InventoryDefinitionsService } from '../services/inventory-definitions.service';
import { CreateUnitOfMeasureDto } from '../dto/create-unit-of-measure.dto';
import { UpdateUnitOfMeasureDto } from '../dto/update-unit-of-measure.dto';
import { CreateAdjustmentReasonDto } from '../dto/create-adjustment-reason.dto';
import { UpdateAdjustmentReasonDto } from '../dto/update-adjustment-reason.dto';

@ApiTags('Inventory Definitions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/definitions')
export class InventoryDefinitionsController {
  constructor(private readonly definitionsService: InventoryDefinitionsService) {}

  // ── Units of Measure ──────────────────────────────────────────────────────

  @Get('units-of-measure')
  @ApiOperation({ summary: 'List all units of measure' })
  @Permissions('inventory:view')
  findAllUnitsOfMeasure(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.definitionsService.findAllUnitsOfMeasure(tenantId, query);
  }

  @Get('units-of-measure/:id')
  @ApiOperation({ summary: 'Get unit of measure by ID' })
  @Permissions('inventory:view')
  findUnitOfMeasureById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.definitionsService.findUnitOfMeasureById(tenantId, id);
  }

  @Post('units-of-measure')
  @ApiOperation({ summary: 'Create a unit of measure' })
  @Permissions('inventory:create')
  createUnitOfMeasure(
    @TenantId() tenantId: string,
    @Body() dto: CreateUnitOfMeasureDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.definitionsService.createUnitOfMeasure(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch('units-of-measure/:id')
  @ApiOperation({ summary: 'Update a unit of measure' })
  @Permissions('inventory:update')
  updateUnitOfMeasure(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUnitOfMeasureDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.definitionsService.updateUnitOfMeasure(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('units-of-measure/:id')
  @ApiOperation({ summary: 'Delete a unit of measure' })
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUnitOfMeasure(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.definitionsService.deleteUnitOfMeasure(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Adjustment Reasons ────────────────────────────────────────────────────

  @Get('adjustment-reasons')
  @ApiOperation({ summary: 'List all adjustment reasons' })
  @Permissions('inventory:view')
  findAllAdjustmentReasons(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.definitionsService.findAllAdjustmentReasons(tenantId, query);
  }

  @Get('adjustment-reasons/:id')
  @ApiOperation({ summary: 'Get adjustment reason by ID' })
  @Permissions('inventory:view')
  findAdjustmentReasonById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.definitionsService.findAdjustmentReasonById(tenantId, id);
  }

  @Post('adjustment-reasons')
  @ApiOperation({ summary: 'Create an adjustment reason' })
  @Permissions('inventory:create')
  createAdjustmentReason(
    @TenantId() tenantId: string,
    @Body() dto: CreateAdjustmentReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.definitionsService.createAdjustmentReason(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Patch('adjustment-reasons/:id')
  @ApiOperation({ summary: 'Update an adjustment reason' })
  @Permissions('inventory:update')
  updateAdjustmentReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAdjustmentReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.definitionsService.updateAdjustmentReason(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('adjustment-reasons/:id')
  @ApiOperation({ summary: 'Delete an adjustment reason' })
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAdjustmentReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.definitionsService.deleteAdjustmentReason(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
