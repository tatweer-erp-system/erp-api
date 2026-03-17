import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { FiscalPositionsService } from '../services/fiscal-positions.service';
import { CreateFiscalPositionDto } from '../dto/create-fiscal-position.dto';
import { UpdateFiscalPositionDto } from '../dto/update-fiscal-position.dto';
import { ResolveFiscalPositionDto } from '../dto/resolve-fiscal-position.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Accounting - Fiscal Positions')
@Controller('fiscal-positions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FiscalPositionsController {
  constructor(private readonly fiscalPositionsService: FiscalPositionsService) {}

  @Get()
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'List all fiscal positions' })
  @ApiOkResponse({ description: 'Paginated list of fiscal positions' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.fiscalPositionsService.findAll(tenantId, query);
  }

  @Get('resolve')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Resolve taxes through partner fiscal position' })
  @ApiOkResponse({ description: 'Resolved tax IDs' })
  resolve(@TenantId() tenantId: string, @Query() dto: ResolveFiscalPositionDto) {
    return this.fiscalPositionsService.resolve(tenantId, dto);
  }

  @Get(':id')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Get fiscal position by ID with tax/account mappings' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Fiscal position details with mappings' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.fiscalPositionsService.findById(tenantId, id);
  }

  @Post()
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Create a fiscal position with tax/account mappings' })
  @ApiCreatedResponse({ description: 'Fiscal position created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateFiscalPositionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fiscalPositionsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Put(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Update fiscal position (replaces mappings if provided)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Fiscal position updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFiscalPositionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fiscalPositionsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Soft delete a fiscal position' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Fiscal position deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fiscalPositionsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
