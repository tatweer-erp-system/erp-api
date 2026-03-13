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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ContractsService } from '../services/contracts.service';
import { CreateContractDto } from '../dto/create-contract.dto';
import { UpdateContractDto } from '../dto/update-contract.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('HR - Contracts')
@Controller('hr/contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('hr')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Create an employee contract' })
  @ApiCreatedResponse({ description: 'Contract created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateContractDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @Permissions('hr:read')
  @ApiOperation({ summary: 'List contracts' })
  @ApiOkResponse({ description: 'Paginated list of contracts' })
  findAll(
    @TenantId() tenantId: string,
    @Query() query: PaginationDto & { employeeId?: string; status?: string },
  ) {
    return this.contractsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('hr:read')
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ description: 'Contract details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.contractsService.findById(tenantId, id);
  }

  @Patch(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Update a contract' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ description: 'Contract updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Soft delete a contract' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiNoContentResponse({ description: 'Contract deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
