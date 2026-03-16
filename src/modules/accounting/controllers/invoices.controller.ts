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
import { AccountingDocType, AccountingDocStatus } from '@/common/enums/accounting.enums';

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting/invoices')
export class InvoicesController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices for a branch' })
  @ApiOkResponse({ description: 'Paginated list of invoices' })
  @ApiHeader({ name: 'x-branch-id', required: true })
  @ApiQuery({ name: 'docType', required: false, enum: AccountingDocType })
  @ApiQuery({ name: 'status', required: false, enum: AccountingDocStatus })
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Headers('x-branch-id') branchId: string,
    @Query('docType') docType?: AccountingDocType,
    @Query('status') status?: AccountingDocStatus,
    @Query('partnerId') partnerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.accountingService.findAllInvoices(
      branchId,
      { docType, status, partnerId },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Invoice details' })
  findById(@Param('id') id: string) {
    return this.accountingService.findInvoiceById(id);
  }

  @Get(':id/lines')
  @ApiOperation({ summary: 'Get invoice with lines' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Invoice with line items' })
  findWithLines(@Param('id') id: string) {
    return this.accountingService.findInvoiceWithLines(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiCreatedResponse({ description: 'Invoice created' })
  create(@Body() body: Record<string, any>) {
    return this.accountingService.createInvoice(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Invoice updated' })
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const { version, ...data } = body;
    return this.accountingService.updateInvoice(id, version, data);
  }

  @Post(':id/lines')
  @ApiOperation({ summary: 'Upsert invoice lines (replaces all existing lines)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Lines saved' })
  @HttpCode(HttpStatus.NO_CONTENT)
  upsertLines(@Param('id') id: string, @Body() body: { lines: Record<string, any>[] }) {
    return this.accountingService.upsertInvoiceLines(id, body.lines ?? []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete invoice' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Invoice deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.accountingService.removeInvoice(id);
  }
}
