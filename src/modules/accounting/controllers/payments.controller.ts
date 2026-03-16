import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { AccountingService } from '../services/accounting.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AccountingPaymentStatus } from '@/common/enums/accounting.enums';

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting/payments')
export class PaymentsController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get()
  @ApiOperation({ summary: 'List payments for a branch' })
  @ApiOkResponse({ description: 'Paginated list of payments' })
  @ApiHeader({ name: 'x-branch-id', required: true })
  @ApiQuery({ name: 'status', required: false, enum: AccountingPaymentStatus })
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Headers('x-branch-id') branchId: string,
    @Query('status') status?: AccountingPaymentStatus,
    @Query('partnerId') partnerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.accountingService.findAllPayments(
      branchId,
      { status, partnerId },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Payment details' })
  findById(@Param('id') id: string) {
    return this.accountingService.findPaymentById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiCreatedResponse({ description: 'Payment created' })
  create(@Body() body: Record<string, any>) {
    return this.accountingService.createPayment(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update payment' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Payment updated' })
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const { version, ...data } = body;
    return this.accountingService.updatePayment(id, version, data);
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a payment (transition to posted status)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Payment posted' })
  post(@Param('id') id: string) {
    return this.accountingService.postPayment(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Payment deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.accountingService.removePayment(id);
  }
}
