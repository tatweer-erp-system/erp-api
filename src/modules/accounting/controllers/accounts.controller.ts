import {
  Controller,
  Get,
  Post,
  Patch,
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
import { AccountsService } from '../services/accounts.service';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Accounting - Chart of Accounts')
@Controller('accounting/accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post('seed')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Seed default Saudi Chart of Accounts' })
  @ApiCreatedResponse({ description: 'Saudi COA seeded' })
  seedSaudiCoa(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.accountsService.seedSaudiCoa(tenantId, { userId: user.id, tenantId });
  }

  @Get('tree')
  @Permissions('accounting:read')
  @ApiOperation({ summary: 'Get COA as nested tree' })
  @ApiOkResponse({ description: 'Nested COA tree' })
  getTree(@TenantId() tenantId: string) {
    return this.accountsService.getTree(tenantId);
  }

  @Get()
  @Permissions('accounting:read')
  @ApiOperation({ summary: 'List all accounts (flat)' })
  @ApiOkResponse({ description: 'Paginated list of accounts' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.accountsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('accounting:read')
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Account details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.accountsService.findById(tenantId, id);
  }

  @Post()
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Create a new account' })
  @ApiCreatedResponse({ description: 'Account created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accountsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Patch(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Update account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Account updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accountsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Soft delete account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Account deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accountsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
