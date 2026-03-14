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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { TreasuryAccountsService } from '../services/treasury-accounts.service';
import { CreateTreasuryAccountDto } from '../dto/create-treasury-account.dto';
import { UpdateTreasuryAccountDto } from '../dto/update-treasury-account.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';

@ApiTags('Treasury - Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('treasury/accounts')
export class TreasuryAccountsController {
  constructor(private readonly service: TreasuryAccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a treasury account' })
  @Permissions('treasury:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTreasuryAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @ApiOperation({ summary: 'List treasury accounts' })
  @Permissions('treasury:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.service.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a treasury account by ID' })
  @Permissions('treasury:view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a treasury account' })
  @Permissions('treasury:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTreasuryAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a treasury account' })
  @Permissions('treasury:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
