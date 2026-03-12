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
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('CRM - Leads')
@ApiBearerAuth()
@ModuleFeature('crm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get leads dropdown list' })
  @Permissions('crm:read')
  getDropdown(@TenantId() tenantId: string, @Query() query: DropdownQueryDto) {
    return this.leadsService.getDropdown(tenantId, query);
  }

  @Get()
  @ApiOperation({ summary: 'List all leads' })
  @Permissions('crm:read')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.leadsService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  @Permissions('crm:read')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.leadsService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a lead' })
  @Permissions('crm:create')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a lead' })
  @Permissions('crm:update')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Patch(':id/transition')
  @ApiOperation({ summary: 'Transition lead status' })
  @Permissions('crm:update')
  transition(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: TransitionLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.transition(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lead' })
  @Permissions('crm:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
