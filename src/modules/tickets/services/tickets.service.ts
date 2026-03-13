import { Injectable, Logger } from '@nestjs/common';
import { TicketReply } from '../entities/ticket-reply.entity';
import { TicketsRepository } from '@/database/sql/repositories/tickets.repository';
import { TicketRepliesRepository } from '@/database/sql/repositories/ticket-replies.repository';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { UpdateTicketDto } from '../dto/update-ticket.dto';
import { CreateTicketReplyDto } from '../dto/create-ticket-reply.dto';
import { TicketQueryDto } from '../dto/ticket-query.dto';
import { PaginatedResult } from '@/common/interfaces/pagination.interface';
import { Ticket } from '../entities/ticket.entity';
import { TicketStatus } from '@/common/enums/ticket.enums';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly ticketRepliesRepository: TicketRepliesRepository,
  ) {}

  async findAll(tenantId: string, query: TicketQueryDto): Promise<PaginatedResult<Ticket>> {
    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.assignedTo) where.assignedTo = query.assignedTo;

    return this.ticketsRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['subject'],
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'DESC',
      where,
      tenantId: tenantId || undefined,
      bypassTenantScope: !tenantId,
    });
  }

  async findById(tenantId: string, id: string): Promise<Ticket> {
    return this.ticketsRepository.findById(id, {
      include: [{ model: TicketReply }],
      tenantId: tenantId || undefined,
      bypassTenantScope: !tenantId,
    });
  }

  async create(
    tenantId: string,
    dto: CreateTicketDto,
    userId?: string,
    userName?: string,
  ): Promise<Ticket> {
    const ticket = await this.ticketsRepository.create(
      {
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority ?? 'medium',
        status: 'open',
        tenantId: dto.tenantId,
        tenantName: dto.tenantName,
        createdBy: userId,
        createdByName: userName,
        assignedTo: dto.assignedTo,
        assignedToName: dto.assignedToName,
      } as Partial<Ticket>,
      { tenantId: tenantId || undefined, bypassTenantScope: !tenantId },
    );

    this.logger.log(`Ticket created: ${ticket.id}`);
    return ticket;
  }

  async update(tenantId: string, id: string, dto: UpdateTicketDto): Promise<Ticket> {
    const updateData: Record<string, unknown> = {};
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.assignedTo !== undefined) updateData.assignedTo = dto.assignedTo;
    if (dto.assignedToName !== undefined) updateData.assignedToName = dto.assignedToName;

    const ticket = await this.ticketsRepository.update(id, updateData as Partial<Ticket>, {
      tenantId: tenantId || undefined,
      bypassTenantScope: !tenantId,
    });
    this.logger.log(`Ticket updated: ${id}`);
    return ticket;
  }

  async addReply(
    tenantId: string,
    ticketId: string,
    dto: CreateTicketReplyDto,
    userId?: string,
    userName?: string,
  ): Promise<TicketReply> {
    // Verify ticket exists
    await this.ticketsRepository.findById(ticketId, {
      tenantId: tenantId || undefined,
      bypassTenantScope: !tenantId,
    });

    const reply = await this.ticketRepliesRepository.create(
      {
        ticketId,
        userId,
        userName,
        senderType: dto.senderType ?? 'agent',
        message: dto.message,
      } as Partial<TicketReply>,
      { tenantId: tenantId || undefined, bypassTenantScope: !tenantId },
    );

    this.logger.log(`Reply added to ticket ${ticketId}`);
    return reply;
  }

  async getStats(tenantId: string): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  }> {
    const scopeOpts = { tenantId: tenantId || undefined, bypassTenantScope: !tenantId };
    const total = await this.ticketsRepository.count(scopeOpts);
    const open = await this.ticketsRepository.count({
      where: { status: TicketStatus.OPEN },
      ...scopeOpts,
    });
    const inProgress = await this.ticketsRepository.count({
      where: { status: TicketStatus.IN_PROGRESS },
      ...scopeOpts,
    });
    const resolved = await this.ticketsRepository.count({
      where: { status: TicketStatus.RESOLVED },
      ...scopeOpts,
    });
    const closed = await this.ticketsRepository.count({
      where: { status: TicketStatus.CLOSED },
      ...scopeOpts,
    });

    return { total, open, inProgress, resolved, closed };
  }
}
