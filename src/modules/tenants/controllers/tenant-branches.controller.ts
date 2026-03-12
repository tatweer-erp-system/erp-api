import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TenantBranchesService } from '../services/tenant-branches.service';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { UpdateBranchDto } from '../dto/update-branch.dto';
import { ToggleBranchStatusDto } from '../dto/toggle-branch-status.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Tenant Branches')
@Controller('tenants/:tenantId/branches')
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@ApiBearerAuth()
export class TenantBranchesController {
  constructor(private readonly tenantBranchesService: TenantBranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List branches for a tenant (paginated)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Paginated list of branches' })
  findAll(@Param('tenantId') tenantId: string, @Query() query: PaginationDto) {
    return this.tenantBranchesService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a branch by ID' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'id', description: 'Branch UUID' })
  @ApiResponse({ status: 200, description: 'Branch details' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  findById(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.tenantBranchesService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new branch for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  @ApiResponse({ status: 409, description: 'Branch code already exists' })
  create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateBranchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantBranchesService.create(tenantId, dto, { userId: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a branch' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'id', description: 'Branch UUID' })
  @ApiResponse({ status: 200, description: 'Branch updated successfully' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  @ApiResponse({ status: 409, description: 'Branch code conflict' })
  update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantBranchesService.update(tenantId, id, dto, { userId: user.id });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a branch' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'id', description: 'Branch UUID' })
  @ApiResponse({ status: 200, description: 'Branch status updated' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  toggleStatus(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ToggleBranchStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantBranchesService.toggleStatus(tenantId, id, dto.isActive, { userId: user.id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a branch' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'id', description: 'Branch UUID' })
  @ApiResponse({ status: 204, description: 'Branch deleted' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  remove(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantBranchesService.remove(tenantId, id, { userId: user.id });
  }
}
