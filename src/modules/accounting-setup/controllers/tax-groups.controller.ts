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
import { TaxGroupsService } from '../services/tax-groups.service';
import { CreateTaxGroupDto } from '../dto/create-tax-group.dto';
import { UpdateTaxGroupDto } from '../dto/update-tax-group.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Accounting Setup - Tax Groups')
@Controller('tax-groups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class TaxGroupsController {
  constructor(private readonly taxGroupsService: TaxGroupsService) {}

  @Get()
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'List all tax groups' })
  @ApiOkResponse({ description: 'Paginated list of tax groups' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.taxGroupsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Get tax group by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Tax group details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.taxGroupsService.findById(tenantId, id);
  }

  @Post()
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Create a new tax group' })
  @ApiCreatedResponse({ description: 'Tax group created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTaxGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taxGroupsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Patch(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Update tax group' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Tax group updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaxGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taxGroupsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Soft delete tax group' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Tax group deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taxGroupsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
