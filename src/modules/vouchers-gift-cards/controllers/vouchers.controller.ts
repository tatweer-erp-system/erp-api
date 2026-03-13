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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VouchersService } from '../services/vouchers.service';
import { CreateVoucherDto } from '../dto/create-voucher.dto';
import { UpdateVoucherDto } from '../dto/update-voucher.dto';
import { ValidateVoucherDto } from '../dto/validate-voucher.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Vouchers')
@ApiBearerAuth()
@ModuleFeature('vouchers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new voucher' })
  @Permissions('vouchers:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateVoucherDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vouchersService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @ApiOperation({ summary: 'List all vouchers' })
  @Permissions('vouchers:manage')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.vouchersService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a voucher by ID' })
  @Permissions('vouchers:manage')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.vouchersService.findById(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a voucher' })
  @Permissions('vouchers:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVoucherDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vouchersService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a voucher' })
  @Permissions('vouchers:manage')
  delete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vouchersService.delete(tenantId, id, { userId: user.id, tenantId });
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate a voucher code' })
  @Permissions('pos:orders')
  validate(@TenantId() tenantId: string, @Body() dto: ValidateVoucherDto) {
    return this.vouchersService.validate(tenantId, dto);
  }
}
