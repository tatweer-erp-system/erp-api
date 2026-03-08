import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../../common/types/request.types';
import { ModuleFeature } from '../../../common/decorators/module-feature.decorator';

@ApiTags('Purchasing - Vendors')
@ApiBearerAuth()
@ModuleFeature('purchasing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchasing/vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}
  @Get() @Permissions('purchasing:list') findAll(@TenantSlug() s: string) { return this.vendorsService.findAll(s); }
  @Get(':id') @Permissions('purchasing:read') findOne(@TenantSlug() s: string, @Param('id') id: string) { return this.vendorsService.findOne(s, id); }
  @Post() @Permissions('purchasing:create') create(@TenantSlug() s: string, @Body() dto: CreateVendorDto, @CurrentUser() u: AuthenticatedUser) { return this.vendorsService.create(s, dto, u.id); }
}
