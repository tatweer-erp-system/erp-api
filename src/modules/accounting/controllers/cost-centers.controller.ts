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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CostCentersService } from '../services/cost-centers.service';
import { CreateCostCenterDto } from '../dto/create-cost-center.dto';
import { UpdateCostCenterDto } from '../dto/update-cost-center.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Accounting - Cost Centers')
@Controller('accounting/cost-centers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Get('tree')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Get cost centers as nested tree' })
  @ApiOkResponse({ description: 'Nested cost center tree' })
  getTree(@TenantId() tenantId: string) {
    return this.costCentersService.getTree(tenantId);
  }

  @Get()
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'List all cost centers (flat)' })
  @ApiOkResponse({ description: 'Paginated list of cost centers' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.costCentersService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Get cost center by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Cost center details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.costCentersService.findById(tenantId, id);
  }

  @Post()
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Create a new cost center' })
  @ApiCreatedResponse({ description: 'Cost center created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateCostCenterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.costCentersService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Patch(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Update cost center' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Cost center updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCostCenterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.costCentersService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Soft delete cost center' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Cost center deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.costCentersService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
