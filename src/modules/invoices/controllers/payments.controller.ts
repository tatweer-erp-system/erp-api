import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentsService } from '../services/payments.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Permissions('payments:view')
  @ApiOperation({ summary: 'List payments' })
  @ApiOkResponse({ description: 'Paginated list of payments' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.paymentsService.findAll(tenantId, query);
  }

  @Post()
  @Permissions('payments:manage')
  @ApiOperation({ summary: 'Create a draft payment' })
  @ApiCreatedResponse({ description: 'Payment created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get(':id')
  @Permissions('payments:view')
  @ApiOperation({ summary: 'Get a single payment' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Payment details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.paymentsService.findById(tenantId, id);
  }

  @Post(':id/post')
  @Permissions('payments:manage')
  @ApiOperation({ summary: 'Post a payment (creates journal entry)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Payment posted' })
  post(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.post(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/cancel')
  @Permissions('payments:manage')
  @ApiOperation({ summary: 'Cancel a payment' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Payment cancelled' })
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.cancel(tenantId, id, { userId: user.id, tenantId });
  }
}
