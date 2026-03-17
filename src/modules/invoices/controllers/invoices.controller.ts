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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { InvoicesService } from '../services/invoices.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { FilterInvoiceDto } from '../dto/filter-invoice.dto';
import { RegisterPaymentDto } from '../dto/register-payment.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Permissions('invoices:view')
  @ApiOperation({ summary: 'List invoices with filters' })
  @ApiOkResponse({ description: 'Paginated list of invoices' })
  findAll(@TenantId() tenantId: string, @Query() query: FilterInvoiceDto) {
    return this.invoicesService.findAll(tenantId, query);
  }

  @Post()
  @Permissions('invoices:manage')
  @ApiOperation({ summary: 'Create a draft invoice' })
  @ApiCreatedResponse({ description: 'Invoice created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicesService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get(':id')
  @Permissions('invoices:view')
  @ApiOperation({ summary: 'Get a single invoice with lines' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Invoice with lines' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invoicesService.findById(tenantId, id);
  }

  @Put(':id')
  @Permissions('invoices:manage')
  @ApiOperation({ summary: 'Update a draft invoice' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Invoice updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicesService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Post(':id/post')
  @Permissions('invoices:manage')
  @ApiOperation({ summary: 'Post an invoice (creates journal entry)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Invoice posted' })
  post(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicesService.post(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/cancel')
  @Permissions('invoices:manage')
  @ApiOperation({ summary: 'Cancel an invoice' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Invoice cancelled' })
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicesService.cancel(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/register-payment')
  @Permissions('invoices:manage')
  @ApiOperation({ summary: 'Register a payment against an invoice' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Payment registered' })
  registerPayment(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RegisterPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicesService.registerPayment(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @Permissions('invoices:manage')
  @ApiOperation({ summary: 'Soft delete a draft invoice' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Invoice deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicesService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
