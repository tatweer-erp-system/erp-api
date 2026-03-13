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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PosCashiersService } from '../services/cashiers.service';
import { CreateCashierDto } from '../dto/create-cashier.dto';
import { UpdateCashierDto } from '../dto/update-cashier.dto';
import { SetPinDto } from '../dto/set-pin.dto';
import { AuthenticatePinDto } from '../dto/authenticate-pin.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('POS - Cashiers')
@ApiBearerAuth()
@ModuleFeature('pos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos/cashiers')
export class CashiersController {
  constructor(private readonly posCashiersService: PosCashiersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new cashier profile' })
  @Permissions('pos:admin')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateCashierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.posCashiersService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @ApiOperation({ summary: 'List all cashier profiles' })
  @Permissions('pos:admin')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.posCashiersService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a cashier profile by ID' })
  @Permissions('pos:admin')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.posCashiersService.findById(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a cashier profile' })
  @Permissions('pos:admin')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCashierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.posCashiersService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a cashier profile' })
  @Permissions('pos:admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.posCashiersService.softDelete(tenantId, id, { userId: user.id, tenantId });
  }

  @Post('authenticate')
  @ApiOperation({ summary: 'Authenticate a cashier by PIN' })
  @Permissions('pos:session')
  @HttpCode(HttpStatus.OK)
  authenticate(@TenantId() tenantId: string, @Body() dto: AuthenticatePinDto) {
    return this.posCashiersService.authenticatePin(tenantId, dto);
  }

  @Post(':id/set-pin')
  @ApiOperation({ summary: 'Set or change a cashier PIN' })
  @Permissions('pos:admin')
  @HttpCode(HttpStatus.OK)
  setPin(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SetPinDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.posCashiersService.setPin(tenantId, id, dto, { userId: user.id, tenantId });
  }
}
