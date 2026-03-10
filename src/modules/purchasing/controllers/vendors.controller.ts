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
import { VendorsService } from '../services/vendors.service';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { UpdateVendorDto } from '../dto/update-vendor.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { ModuleFeature } from '../../../common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';

@ApiTags('Purchasing - Vendors')
@Controller('purchasing/vendors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('purchasing')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get vendors dropdown list' })
  @ApiOkResponse({ description: 'Vendors dropdown list' })
  getDropdown(@TenantSlug() tenantSlug: string, @Query() query: DropdownQueryDto) {
    return this.vendorsService.getDropdown(tenantSlug, query);
  }

  @Get()
  @Permissions('purchasing:read')
  @ApiOperation({ summary: 'List all vendors' })
  @ApiOkResponse({ description: 'Paginated list of vendors' })
  findAll(@TenantSlug() tenantSlug: string, @Query() query: PaginationDto) {
    return this.vendorsService.findAll(tenantSlug, query);
  }

  @Get(':id')
  @Permissions('purchasing:read')
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Vendor details' })
  findById(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.vendorsService.findById(tenantSlug, id);
  }

  @Post()
  @Permissions('purchasing:create')
  @ApiOperation({ summary: 'Create a new vendor' })
  @ApiCreatedResponse({ description: 'Vendor created' })
  create(
    @TenantSlug() tenantSlug: string,
    @Body() dto: CreateVendorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vendorsService.create(tenantSlug, dto, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Put(':id')
  @Permissions('purchasing:update')
  @ApiOperation({ summary: 'Update vendor' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Vendor updated' })
  update(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vendorsService.update(tenantSlug, id, dto, {
      userId: user.id,
      tenantSlug,
    });
  }

  @Delete(':id')
  @Permissions('purchasing:delete')
  @ApiOperation({ summary: 'Delete vendor (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Vendor deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vendorsService.remove(tenantSlug, id, {
      userId: user.id,
      tenantSlug,
    });
  }
}
