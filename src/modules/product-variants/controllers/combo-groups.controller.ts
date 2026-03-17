import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ComboProductsService } from '../services/combo-products.service';
import { CreateComboGroupDto } from '../dto/create-combo-group.dto';
import { UpdateComboGroupDto } from '../dto/update-combo-group.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Combo Groups')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('combo-groups')
export class ComboGroupsController {
  constructor(private readonly comboProductsService: ComboProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a combo group' })
  @Permissions('products:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateComboGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comboProductsService.createGroup(tenantId, dto, { userId: user.id, tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a combo group' })
  @Permissions('products:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateComboGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comboProductsService.updateGroup(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a combo group' })
  @Permissions('products:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comboProductsService.removeGroup(tenantId, id, { userId: user.id, tenantId });
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'List items in a combo group' })
  @Permissions('products:view')
  findItems(@TenantId() tenantId: string, @Param('id') groupId: string) {
    return this.comboProductsService.findItemsByGroup(tenantId, groupId);
  }
}
