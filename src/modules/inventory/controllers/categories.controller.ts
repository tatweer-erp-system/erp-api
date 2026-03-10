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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantSlug } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Inventory - Categories')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get categories dropdown list' })
  @Permissions('inventory:read')
  getDropdown(@TenantSlug() slug: string, @Query() query: DropdownQueryDto) {
    return this.categoriesService.getDropdown(slug, query);
  }

  @Get()
  @ApiOperation({ summary: 'List all categories' })
  @Permissions('inventory:read')
  findAll(@TenantSlug() slug: string, @Query() pagination: PaginationDto) {
    return this.categoriesService.findAll(slug, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @Permissions('inventory:read')
  findById(@TenantSlug() slug: string, @Param('id') id: string) {
    return this.categoriesService.findById(slug, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  @Permissions('inventory:create')
  create(
    @TenantSlug() slug: string,
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriesService.create(slug, dto, { userId: user.id, tenantSlug: slug });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a category' })
  @Permissions('inventory:update')
  update(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriesService.update(slug, id, dto, { userId: user.id, tenantSlug: slug });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriesService.remove(slug, id, { userId: user.id, tenantSlug: slug });
  }
}
