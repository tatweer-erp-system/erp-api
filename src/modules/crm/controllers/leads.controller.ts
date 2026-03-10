import {
  Controller,
  Get,
  Post,
  Put,
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
import { LeadsService } from '../services/leads.service';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import { TransitionLeadDto } from '../dto/transition-lead.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';
import { ModuleFeature } from '../../../common/decorators/module-feature.decorator';

@ApiTags('CRM - Leads')
@ApiBearerAuth()
@ModuleFeature('crm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('crm/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get leads dropdown list' })
  @Permissions('crm:read')
  getDropdown(@TenantSlug() slug: string, @Query() query: DropdownQueryDto) {
    return this.leadsService.getDropdown(slug, query);
  }

  @Get()
  @ApiOperation({ summary: 'List all leads' })
  @Permissions('crm:read')
  findAll(@TenantSlug() slug: string, @Query() pagination: PaginationDto) {
    return this.leadsService.findAll(slug, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  @Permissions('crm:read')
  findById(@TenantSlug() slug: string, @Param('id') id: string) {
    return this.leadsService.findById(slug, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a lead' })
  @Permissions('crm:create')
  create(
    @TenantSlug() slug: string,
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.create(slug, dto, { userId: user.id, tenantSlug: slug });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a lead' })
  @Permissions('crm:update')
  update(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.update(slug, id, dto, { userId: user.id, tenantSlug: slug });
  }

  @Patch(':id/transition')
  @ApiOperation({ summary: 'Transition lead status' })
  @Permissions('crm:update')
  transition(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @Body() dto: TransitionLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.transition(slug, id, dto, { userId: user.id, tenantSlug: slug });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lead' })
  @Permissions('crm:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.remove(slug, id, { userId: user.id, tenantSlug: slug });
  }
}
