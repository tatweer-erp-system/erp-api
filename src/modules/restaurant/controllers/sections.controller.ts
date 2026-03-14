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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SectionsService } from '../services/sections.service';
import { CreateSectionDto } from '../dto/create-section.dto';
import { UpdateSectionDto } from '../dto/update-section.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Restaurant - Sections')
@Controller('restaurant/sections')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  @Permissions('restaurant:manage')
  @ApiOperation({ summary: 'Create a restaurant section' })
  @ApiCreatedResponse({ description: 'Section created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateSectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sectionsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @Permissions('restaurant:view')
  @ApiOperation({ summary: 'List restaurant sections' })
  @ApiOkResponse({ description: 'Paginated list of sections' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.sectionsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('restaurant:view')
  @ApiOperation({ summary: 'Get a restaurant section by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Section details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.sectionsService.findById(tenantId, id);
  }

  @Patch(':id')
  @Permissions('restaurant:manage')
  @ApiOperation({ summary: 'Update a restaurant section' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Section updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sectionsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('restaurant:manage')
  @ApiOperation({ summary: 'Soft delete a restaurant section' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Section deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sectionsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
