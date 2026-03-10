import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
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
  @Get() @Permissions('crm:list') findAll(@TenantSlug() s: string, @Query() p: PaginationDto) {
    return this.leadsService.findAll(s, p);
  }
  @Get(':id') @Permissions('crm:read') findOne(@TenantSlug() s: string, @Param('id') id: string) {
    return this.leadsService.findOne(s, id);
  }
  @Post() @Permissions('crm:create') create(
    @TenantSlug() s: string,
    @Body() dto: CreateLeadDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.leadsService.create(s, dto, u.id);
  }
  @Delete(':id') @Permissions('crm:delete') @HttpCode(HttpStatus.NO_CONTENT) remove(
    @TenantSlug() s: string,
    @Param('id') id: string,
  ) {
    return this.leadsService.remove(s, id);
  }
}
