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
import { AuthenticatedUser } from '@/common/types/request.types';
import { TicketReplySender } from '@/common/enums/ticket.enums';

@ApiTags('Admin - Tickets')
@Controller('admin/tickets')
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@ApiBearerAuth()
export class AdminTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tickets (admin, paginated, filterable)' })
  @ApiResponse({ status: 200, description: 'Tickets list retrieved successfully' })
  findAll(@Query() query: TicketQueryDto) {
    return this.ticketsService.findAll('', query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get admin ticket statistics' })
  @ApiResponse({ status: 200, description: 'Admin ticket statistics' })
  getAdminStats() {
    return this.ticketsService.getAdminStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID (includes replies)' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findById(@Param('id') id: string) {
    return this.ticketsService.findById('', id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new ticket (admin)' })
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.create('', dto, user.id, user.email);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket status/priority/assignee (admin)' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket updated successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update('', id, dto);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a ticket as admin' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 201, description: 'Reply added successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 400, description: 'Ticket is closed' })
  addReply(
    @Param('id') id: string,
    @Body() dto: CreateTicketReplyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.addReply('', id, dto, TicketReplySender.AGENT, user.id, user.email);
  }
}
