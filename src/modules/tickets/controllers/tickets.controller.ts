import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from '../services/tickets.service';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { UpdateTicketDto } from '../dto/update-ticket.dto';
import { CreateTicketReplyDto } from '../dto/create-ticket-reply.dto';
import { TicketQueryDto } from '../dto/ticket-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@ApiBearerAuth()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List tickets (paginated, filterable)' })
  @ApiResponse({ status: 200, description: 'Tickets list retrieved successfully' })
  findAll(@TenantId() tenantId: string, @Query() query: TicketQueryDto) {
    return this.ticketsService.findAll(tenantId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get ticket statistics' })
  @ApiResponse({ status: 200, description: 'Ticket statistics' })
  getStats(@TenantId() tenantId: string) {
    return this.ticketsService.getStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID (includes replies)' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.ticketsService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.create(tenantId, dto, user.id, user.email);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket status/priority/assignee' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket updated successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(tenantId, id, dto);
  }

  @Post(':id/replies')
  @ApiOperation({ summary: 'Add a reply to a ticket' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 201, description: 'Reply added successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  addReply(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateTicketReplyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.addReply(tenantId, id, dto, user.id, user.email);
  }
}
