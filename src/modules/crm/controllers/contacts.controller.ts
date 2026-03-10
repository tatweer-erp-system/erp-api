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
import { ContactsService } from '../services/contacts.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantSlug } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('CRM - Contacts')
@ApiBearerAuth()
@ModuleFeature('crm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('crm/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get contacts dropdown list' })
  @Permissions('crm:read')
  getDropdown(@TenantSlug() slug: string, @Query() query: DropdownQueryDto) {
    return this.contactsService.getDropdown(slug, query);
  }

  @Get()
  @ApiOperation({ summary: 'List all contacts' })
  @Permissions('crm:read')
  findAll(@TenantSlug() slug: string, @Query() pagination: PaginationDto) {
    return this.contactsService.findAll(slug, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact by ID' })
  @Permissions('crm:read')
  findById(@TenantSlug() slug: string, @Param('id') id: string) {
    return this.contactsService.findById(slug, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a contact' })
  @Permissions('crm:create')
  create(
    @TenantSlug() slug: string,
    @Body() dto: CreateContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contactsService.create(slug, dto, { userId: user.id, tenantSlug: slug });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a contact' })
  @Permissions('crm:update')
  update(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contactsService.update(slug, id, dto, { userId: user.id, tenantSlug: slug });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contact' })
  @Permissions('crm:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantSlug() slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contactsService.remove(slug, id, { userId: user.id, tenantSlug: slug });
  }
}
