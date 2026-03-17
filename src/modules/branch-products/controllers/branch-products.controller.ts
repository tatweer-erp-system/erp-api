import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BranchProductsService } from '../services/branch-products.service';
import { AssignProductsDto } from '../dto/assign-products.dto';
import { UnassignProductsDto } from '../dto/unassign-products.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Inventory - Branch Products')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('branch-products')
export class BranchProductsController {
  constructor(private readonly branchProductsService: BranchProductsService) {}

  @Get(':branchId')
  @ApiOperation({ summary: 'List products assigned to a branch' })
  @Permissions('inventory:view')
  getAssigned(@TenantId() tenantId: string, @Param('branchId') branchId: string) {
    return this.branchProductsService.getAssigned(tenantId, branchId);
  }

  @Post(':branchId/assign')
  @ApiOperation({ summary: 'Assign products to a branch' })
  @Permissions('inventory:manage')
  assign(
    @TenantId() tenantId: string,
    @Param('branchId') branchId: string,
    @Body() dto: AssignProductsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.branchProductsService.assign(tenantId, branchId, dto.productIds, {
      userId: user.id,
      tenantId,
    });
  }

  @Post(':branchId/unassign')
  @ApiOperation({ summary: 'Unassign products from a branch' })
  @Permissions('inventory:manage')
  unassign(
    @TenantId() tenantId: string,
    @Param('branchId') branchId: string,
    @Body() dto: UnassignProductsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.branchProductsService.unassign(tenantId, branchId, dto.productIds, {
      userId: user.id,
      tenantId,
    });
  }
}
