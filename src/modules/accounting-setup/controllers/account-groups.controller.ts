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
import { AccountGroupsService } from '../services/account-groups.service';
import { CreateAccountGroupDto } from '../dto/create-account-group.dto';
import { UpdateAccountGroupDto } from '../dto/update-account-group.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Accounting Setup - Account Groups')
@Controller('account-groups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AccountGroupsController {
  constructor(private readonly accountGroupsService: AccountGroupsService) {}

  @Get('tree')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Get account groups as nested tree' })
  @ApiOkResponse({ description: 'Nested account groups tree' })
  getTree(@TenantId() tenantId: string) {
    return this.accountGroupsService.getTree(tenantId);
  }

  @Get()
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'List all account groups' })
  @ApiOkResponse({ description: 'Paginated list of account groups' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.accountGroupsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Get account group by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Account group details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.accountGroupsService.findById(tenantId, id);
  }

  @Post()
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Create a new account group' })
  @ApiCreatedResponse({ description: 'Account group created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateAccountGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accountGroupsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Patch(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Update account group' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Account group updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAccountGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accountGroupsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Soft delete account group' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Account group deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accountGroupsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
