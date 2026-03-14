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
import { MergeContactDto } from '../dto/merge-contact.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
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
  @Permissions('crm:view')
  getDropdown(@TenantId() tenantId: string, @Query() query: DropdownQueryDto) {
    return this.contactsService.getDropdown(tenantId, query);
  }

  @Get()
  @ApiOperation({ summary: 'List all contacts' })
  @Permissions('crm:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.contactsService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact by ID with associated leads' })
  @Permissions('crm:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.contactsService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a contact' })
  @Permissions('crm:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contactsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a contact' })
  @Permissions('crm:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contactsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Post(':id/merge')
  @ApiOperation({ summary: 'Merge two contacts — reassigns leads to the target contact' })
  @Permissions('crm:manage')
  merge(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: MergeContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contactsService.merge(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contact' })
  @Permissions('crm:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contactsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
