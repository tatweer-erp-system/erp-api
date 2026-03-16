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
import { InventoryOpsService } from '../services/inventory-ops.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { TransferStatus } from '@/common/enums/inventory.enums';

class CreateTransferDto {
  branchId: string;
  fromLocationId: string;
  toLocationId: string;
  scheduledDate: Date;
  reference?: string;
  fromBranchId?: string;
  toBranchId?: string;
  notes?: string;
}

class UpdateTransferDto extends CreateTransferDto {
  version: number;
}

class TransferLineDto {
  productId: string;
  qtyRequested: number;
  qtyDone?: number;
  uomId?: string;
  lotId?: string;
}

@ApiTags('Inventory - Stock Transfers')
@ApiBearerAuth()
@ModuleFeature('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/transfers-ops')
export class TransfersOpsController {
  constructor(private readonly inventoryOpsService: InventoryOpsService) {}

  @Get()
  @ApiOperation({ summary: 'List stock transfers' })
  @Permissions('inventory:view')
  findAll(
    @Query('branchId') branchId: string,
    @Query('status') status?: TransferStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.inventoryOpsService.findAllTransfers(
      branchId,
      { status },
      Number(page),
      Number(limit),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock transfer by ID' })
  @Permissions('inventory:view')
  findById(@Param('id') id: string) {
    return this.inventoryOpsService.findTransferById(id);
  }

  @Get(':id/lines')
  @ApiOperation({ summary: 'Get stock transfer with lines' })
  @Permissions('inventory:view')
  findWithLines(@Param('id') id: string) {
    return this.inventoryOpsService.findTransferWithLines(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a stock transfer' })
  @Permissions('inventory:manage')
  create(@Body() dto: CreateTransferDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryOpsService.createTransfer({
      ...dto,
      createdBy: user.id,
    });
  }

  @Post(':id/lines')
  @ApiOperation({ summary: 'Upsert lines on a stock transfer' })
  @Permissions('inventory:manage')
  upsertLines(@Param('id') id: string, @Body() lines: TransferLineDto[]) {
    return this.inventoryOpsService.upsertTransferLines(id, lines);
  }

  @Post(':id/done')
  @ApiOperation({ summary: 'Mark transfer as done' })
  @Permissions('inventory:manage')
  @HttpCode(HttpStatus.OK)
  done(@Param('id') id: string) {
    return this.inventoryOpsService.updateTransferStatus(id, TransferStatus.DONE);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a stock transfer' })
  @Permissions('inventory:manage')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = dto;
    return this.inventoryOpsService.createTransfer({ ...data, updatedBy: user.id });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a stock transfer' })
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.inventoryOpsService.removeTransfer(id);
  }
}
