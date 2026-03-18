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
import { PartnersService } from '../services/partners.service';
import { CreatePartnerDto } from '../dto/create-partner.dto';
import { UpdatePartnerDto } from '../dto/update-partner.dto';
import { FilterPartnerDto } from '../dto/filter-partner.dto';
import { PartnerDropdownQueryDto } from '../dto/partner-dropdown-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Partners')
@Controller('partners')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get partners dropdown list' })
  @ApiOkResponse({ description: 'Partners dropdown list' })
  @Permissions('partners:view')
  getDropdown(@TenantId() tenantId: string, @Query() query: PartnerDropdownQueryDto) {
    return this.partnersService.getDropdown(tenantId, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Customer summary — total, active, inactive counts' })
  @Permissions('partners:view')
  getCustomerSummary(@TenantId() tenantId: string) {
    return this.partnersService.getCustomerSummary(tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List all partners with optional filters' })
  @ApiOkResponse({ description: 'Paginated list of partners' })
  @Permissions('partners:view')
  findAll(@TenantId() tenantId: string, @Query() query: FilterPartnerDto) {
    return this.partnersService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get partner by ID with associated contacts' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Partner details with contacts' })
  @Permissions('partners:view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.partnersService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiCreatedResponse({ description: 'Partner created' })
  @Permissions('partners:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreatePartnerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.partnersService.create(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a partner (requires version for optimistic locking)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Partner updated' })
  @Permissions('partners:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.partnersService.update(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a partner' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Partner deleted' })
  @Permissions('partners:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.partnersService.remove(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
