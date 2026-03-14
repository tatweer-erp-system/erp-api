import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Op } from 'sequelize';
import { TicketReply } from '../entities/ticket-reply.entity';
import { TicketsRepository } from '@/database/sql/repositories/tickets.repository';
import { TicketRepliesRepository } from '@/database/sql/repositories/ticket-replies.repository';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { UpdateTicketDto } from '../dto/update-ticket.dto';
import { CreateTicketReplyDto } from '../dto/create-ticket-reply.dto';
import { TicketQueryDto } from '../dto/ticket-query.dto';
import { PaginatedResult } from '@/common/interfaces/pagination.interface';
import { Ticket } from '../entities/ticket.entity';
import {
  TicketStatus,
  TicketPriority,
  TicketReplySender,
} from '@/common/enums/ticket.enums';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

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
    const ticket = await this.ticketsRepository.findByIdOrNull(id, {
      include: [{ model: TicketReply }],
      tenantId: tenantId || undefined,
      bypassTenantScope: !tenantId,
    });

    if (!ticket) {
      throw new NotFoundException(msg(ErrorMessages.TICKET_NOT_FOUND, id));
    }

    return ticket;
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
        priority: dto.priority ?? TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
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
    senderType: TicketReplySender,
    userId?: string,
    userName?: string,
  ): Promise<TicketReply> {
    // Verify ticket exists
    const ticket = await this.ticketsRepository.findByIdOrNull(ticketId, {
      tenantId: tenantId || undefined,
      bypassTenantScope: !tenantId,
    });

    if (!ticket) {
      throw new NotFoundException(msg(ErrorMessages.TICKET_NOT_FOUND, ticketId));
    }

    // Block replies to closed tickets
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException(msg(ErrorMessages.TICKET_CLOSED, ticketId));
    }

    // When tenant (CLIENT) replies to a RESOLVED ticket, auto-reopen it
    if (
      senderType === TicketReplySender.CLIENT &&
      ticket.status === TicketStatus.RESOLVED
    ) {
      await this.ticketsRepository.update(
        ticketId,
        { status: TicketStatus.OPEN } as Partial<Ticket>,
        {
          tenantId: tenantId || undefined,
          bypassTenantScope: !tenantId,
        },
      );
      this.logger.log(`Ticket ${ticketId} auto-reopened after client reply on resolved ticket`);
    }

    const reply = await this.ticketRepliesRepository.create(
      {
        ticketId,
        userId,
        userName,
        senderType,
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

  async getAdminStats(): Promise<{
    totalByStatus: Record<string, number>;
    avgResolutionTimeHours: number | null;
    ticketsByPriority: Record<string, number>;
    openTicketsOlderThan48h: number;
  }> {
    const scopeOpts = { bypassTenantScope: true };

    // Total by status
    const totalByStatus: Record<string, number> = {};
    for (const status of Object.values(TicketStatus)) {
      totalByStatus[status] = await this.ticketsRepository.count({
        where: { status },
        ...scopeOpts,
      });
    }

    // Tickets by priority
    const ticketsByPriority: Record<string, number> = {};
    for (const priority of Object.values(TicketPriority)) {
      ticketsByPriority[priority] = await this.ticketsRepository.count({
        where: { priority },
        ...scopeOpts,
      });
    }

    // Average resolution time (from created to resolved/closed)
    const avgResult = await this.ticketsRepository.rawQuery<
      { avg_hours: string | null }[]
    >(
      `SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) AS avg_hours
       FROM public.tickets
       WHERE status IN (:resolvedStatus, :closedStatus)
         AND "deletedAt" IS NULL`,
      {
        resolvedStatus: TicketStatus.RESOLVED,
        closedStatus: TicketStatus.CLOSED,
      },
    );
    const avgResolutionTimeHours = avgResult[0]?.avg_hours
      ? parseFloat(parseFloat(avgResult[0].avg_hours).toFixed(2))
      : null;

    // Open tickets older than 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const openTicketsOlderThan48h = await this.ticketsRepository.count({
      where: {
        status: TicketStatus.OPEN,
        createdAt: { [Op.lt]: fortyEightHoursAgo },
      },
      ...scopeOpts,
    });

    return {
      totalByStatus,
      avgResolutionTimeHours,
      ticketsByPriority,
      openTicketsOlderThan48h,
    };
  }
}
