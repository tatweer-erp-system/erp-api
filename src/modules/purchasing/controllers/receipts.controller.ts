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
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { PurchasingService } from '../services/purchasing.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ReceiptStatus } from '@/common/enums/purchasing.enums';

@ApiTags('Purchasing - Receipts')
@Controller('receipts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReceiptsController {
  constructor(private readonly purchasingService: PurchasingService) {}

  @Get()
  @ApiOperation({ summary: 'List receipts for a branch' })
  @ApiHeader({ name: 'x-branch-id', required: true, description: 'Branch UUID' })
  @ApiOkResponse({ description: 'Paginated list of receipts' })
  findAll(
    @Headers('x-branch-id') branchId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: ReceiptStatus,
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('search') search?: string,
  ) {
    return this.purchasingService.findAllReceipts(
      branchId,
      { status, purchaseOrderId, search },
      +page,
      +limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get receipt by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Receipt' })
  findById(@Param('id') id: string) {
    return this.purchasingService.findReceiptById(id);
  }

  @Get(':id/lines')
  @ApiOperation({ summary: 'Get receipt with its lines' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Receipt with lines' })
  findWithLines(@Param('id') id: string) {
    return this.purchasingService.findReceiptWithLines(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new receipt' })
  @ApiCreatedResponse({ description: 'Receipt created' })
  create(@Body() body: Record<string, any>, @CurrentUser() user: AuthenticatedUser) {
    return this.purchasingService.createReceipt({ ...body, createdBy: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update receipt' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Receipt updated' })
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = body;
    return this.purchasingService.updateReceipt(id, version, { ...data, updatedBy: user.id });
  }

  @Post(':id/lines')
  @ApiOperation({ summary: 'Upsert lines on a receipt' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Lines upserted' })
  upsertLines(@Param('id') id: string, @Body() body: { lines: Record<string, any>[] }) {
    return this.purchasingService.upsertReceiptLines(id, body.lines as any);
  }

  @Post(':id/done')
  @ApiOperation({ summary: 'Mark receipt as done' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Receipt marked as done' })
  done(@Param('id') id: string) {
    return this.purchasingService.markReceiptDone(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete receipt (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Receipt deleted' })
  remove(@Param('id') id: string) {
    return this.purchasingService.deleteReceipt(id);
  }
}
