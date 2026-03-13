import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CashMovementsService } from '../services/cash-movements.service';
import { CreateCashMovementDto } from '../dto/create-cash-movement.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('POS - Cash Movements')
@ApiBearerAuth()
@ModuleFeature('pos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos/cash-movements')
export class CashMovementsController {
  constructor(private readonly cashMovementsService: CashMovementsService) {}

  @Get()
  @ApiOperation({ summary: 'List cash movements for current session' })
  @Permissions('pos:session')
  findAll(
    @TenantId() tenantId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashMovementsService.findAll(tenantId, pagination, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a cash movement' })
  @Permissions('pos:session')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashMovementsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Void a cash movement' })
  @Permissions('pos:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  voidMovement(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashMovementsService.voidMovement(tenantId, id, { userId: user.id, tenantId });
  }
}
