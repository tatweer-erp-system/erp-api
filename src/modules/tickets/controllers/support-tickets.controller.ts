import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from '../services/tickets.service';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { CreateTicketReplyDto } from '../dto/create-ticket-reply.dto';
import { TicketQueryDto } from '../dto/ticket-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { TicketReplySender } from '@/common/enums/ticket.enums';

@ApiTags('Support - Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('support/tickets')
export class SupportTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.create(tenantId, dto, user.id, user.email);
  }

  @Get()
  @ApiOperation({ summary: 'List my tickets (paginated, filterable)' })
  @ApiResponse({ status: 200, description: 'Tickets list retrieved successfully' })
  findAll(@TenantId() tenantId: string, @Query() query: TicketQueryDto) {
    return this.ticketsService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID (includes replies)' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.ticketsService.findById(tenantId, id);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a ticket as tenant' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 201, description: 'Reply added successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 400, description: 'Ticket is closed' })
  addReply(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateTicketReplyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.addReply(
      tenantId,
      id,
      dto,
      TicketReplySender.CLIENT,
      user.id,
      user.email,
    );
  }
}
