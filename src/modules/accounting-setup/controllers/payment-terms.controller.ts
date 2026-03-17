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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentTermsService } from '../services/payment-terms.service';
import { CreatePaymentTermDto } from '../dto/create-payment-term.dto';
import { UpdatePaymentTermDto } from '../dto/update-payment-term.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Accounting Setup - Payment Terms')
@Controller('payment-terms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PaymentTermsController {
  constructor(private readonly paymentTermsService: PaymentTermsService) {}

  @Get()
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'List all payment terms' })
  @ApiOkResponse({ description: 'Paginated list of payment terms' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.paymentTermsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('accounting:view')
  @ApiOperation({ summary: 'Get payment term by ID with lines' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Payment term details with lines' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.paymentTermsService.findById(tenantId, id);
  }

  @Post()
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Create a new payment term with lines' })
  @ApiCreatedResponse({ description: 'Payment term created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreatePaymentTermDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentTermsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Patch(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Update payment term (lines are replaced if provided)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Payment term updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentTermDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentTermsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('accounting:manage')
  @ApiOperation({ summary: 'Soft delete payment term and its lines' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Payment term deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentTermsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
