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
import { PartnerContactsService } from '../services/partner-contacts.service';
import { CreatePartnerContactDto } from '../dto/create-partner-contact.dto';
import { UpdatePartnerContactDto } from '../dto/update-partner-contact.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Partners - Contacts')
@Controller('partners')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PartnerContactsController {
  constructor(private readonly partnerContactsService: PartnerContactsService) {}

  @Get(':partnerId/contacts')
  @ApiOperation({ summary: 'List contacts for a partner' })
  @ApiParam({ name: 'partnerId', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Paginated list of partner contacts' })
  @Permissions('partners:view')
  findAll(
    @TenantId() tenantId: string,
    @Param('partnerId') partnerId: string,
    @Query() query: PaginationDto,
  ) {
    return this.partnerContactsService.findAll(tenantId, partnerId, query);
  }

  @Get('contacts/:id')
  @ApiOperation({ summary: 'Get partner contact by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Partner contact details' })
  @Permissions('partners:view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.partnerContactsService.findOne(tenantId, id);
  }

  @Post('contacts')
  @ApiOperation({ summary: 'Create a new partner contact' })
  @ApiCreatedResponse({ description: 'Partner contact created' })
  @Permissions('partners:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreatePartnerContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.partnerContactsService.create(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put('contacts/:id')
  @ApiOperation({
    summary: 'Update a partner contact (requires version for optimistic locking)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Partner contact updated' })
  @Permissions('partners:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.partnerContactsService.update(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('contacts/:id')
  @ApiOperation({ summary: 'Soft delete a partner contact' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Partner contact deleted' })
  @Permissions('partners:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.partnerContactsService.remove(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
