import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SalesOpsService } from '../services/sales-ops.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { DeliveryStatus } from '@/common/enums/sales.enums';

class CreateDeliveryDto {
  branchId: string;
  salesOrderId?: string;
  partnerId?: string;
  scheduledDate?: Date;
  responsibleId?: string;
  reference?: string;
}

class UpdateDeliveryDto extends CreateDeliveryDto {
  version: number;
}

class DeliveryLineDto {
  productId: string;
  description?: string;
  qtyDemand: number;
  qtyDone?: number;
  uomId?: string;
  lotId?: string;
  locationId?: string;
}

@ApiTags('Sales - Deliveries')
@ApiBearerAuth()
@ModuleFeature('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales/deliveries')
export class DeliveriesController {
  constructor(private readonly salesOpsService: SalesOpsService) {}

  @Get()
  @ApiOperation({ summary: 'List deliveries' })
  @Permissions('sales:view')
  findAll(
    @Query('branchId') branchId: string,
    @Query('status') status?: DeliveryStatus,
    @Query('salesOrderId') salesOrderId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.salesOpsService.findAllDeliveries(
      branchId,
      { status, salesOrderId },
      Number(page),
      Number(limit),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a delivery by ID' })
  @Permissions('sales:view')
  findById(@Param('id') id: string) {
    return this.salesOpsService.findDeliveryById(id);
  }

  @Get(':id/lines')
  @ApiOperation({ summary: 'Get a delivery with its lines' })
  @Permissions('sales:view')
  findWithLines(@Param('id') id: string) {
    return this.salesOpsService.findDeliveryWithLines(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a delivery' })
  @Permissions('sales:manage')
  create(@Body() dto: CreateDeliveryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesOpsService.createDelivery({ ...dto, createdBy: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a delivery' })
  @Permissions('sales:manage')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = dto;
    return this.salesOpsService.updateDelivery(id, version, { ...data, updatedBy: user.id });
  }

  @Post(':id/lines')
  @ApiOperation({ summary: 'Upsert lines on a delivery' })
  @Permissions('sales:manage')
  upsertLines(@Param('id') id: string, @Body() lines: DeliveryLineDto[]) {
    return this.salesOpsService.upsertDeliveryLines(id, lines);
  }

  @Post(':id/done')
  @ApiOperation({ summary: 'Mark a delivery as done' })
  @Permissions('sales:manage')
  @HttpCode(HttpStatus.OK)
  done(@Param('id') id: string) {
    return this.salesOpsService.doneDelivery(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a delivery' })
  @Permissions('sales:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.salesOpsService.removeDelivery(id);
  }
}
