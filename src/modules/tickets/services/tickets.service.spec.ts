/* eslint-disable @typescript-eslint/no-unused-vars */
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TicketStatus, TicketPriority, TicketReplySender } from '@/common/enums/ticket.enums';

// Mock all repository/entity imports to prevent entity imports (which pull in uuid ESM)
jest.mock('@/database/sql/repositories/tickets.repository', () => ({
  TicketsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/ticket-replies.repository', () => ({
  TicketRepliesRepository: jest.fn(),
}));
jest.mock('../entities/ticket-reply.entity', () => ({
  TicketReply: jest.fn(),
}));
jest.mock('../entities/ticket.entity', () => ({
  Ticket: jest.fn(),
}));

import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketsRepository: Record<string, jest.Mock>;
  let ticketRepliesRepository: Record<string, jest.Mock>;

  const tenantId = 'tenant-1';
  const ticketId = 'ticket-1';
  const userId = 'user-1';

  const mockTicket = {
    id: ticketId,
    subject: 'Test Ticket',
    description: 'Test description',
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    tenantId,
    createdBy: userId,
  };

  beforeEach(() => {
    ticketsRepository = {
      findAll: jest.fn(),
      findByIdOrNull: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      rawQuery: jest.fn(),
    };

    ticketRepliesRepository = {
      create: jest.fn(),
    };

    service = new TicketsService(ticketsRepository as any, ticketRepliesRepository as any);
  });

  describe('create()', () => {
    it('should create a ticket with status OPEN and default priority MEDIUM', async () => {
      const dto = {
        subject: 'New Ticket',
        description: 'Issue description',
        tenantId,
        tenantName: 'Test Tenant',
      };

      const createdTicket = {
        ...mockTicket,
        id: 'ticket-new',
        subject: dto.subject,
        description: dto.description,
      };

      ticketsRepository.create.mockResolvedValue(createdTicket);

      const result = await service.create(tenantId, dto as any, userId, 'Test User');

      expect(ticketsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: dto.subject,
          description: dto.description,
          priority: TicketPriority.MEDIUM,
          status: TicketStatus.OPEN,
          tenantId,
          createdBy: userId,
          createdByName: 'Test User',
        }),
        expect.any(Object),
      );
      expect(result.status).toBe(TicketStatus.OPEN);
    });

    it('should use provided priority instead of default', async () => {
      const dto = {
        subject: 'Urgent Ticket',
        description: 'Critical issue',
        priority: TicketPriority.CRITICAL,
        tenantId,
        tenantName: 'Test Tenant',
      };

      ticketsRepository.create.mockResolvedValue({
        ...mockTicket,
        priority: TicketPriority.CRITICAL,
      });

      await service.create(tenantId, dto as any, userId);

      expect(ticketsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: TicketPriority.CRITICAL,
        }),
        expect.any(Object),
      );
    });
  });

  describe('addReply()', () => {
    it('should throw BadRequestException when ticket is closed', async () => {
      const closedTicket = { ...mockTicket, status: TicketStatus.CLOSED };
      ticketsRepository.findByIdOrNull.mockResolvedValue(closedTicket);

      await expect(
        service.addReply(
          tenantId,
          ticketId,
          { message: 'Reply' } as any,
          TicketReplySender.CLIENT,
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-reopen RESOLVED ticket when CLIENT replies', async () => {
      const resolvedTicket = { ...mockTicket, status: TicketStatus.RESOLVED };
      ticketsRepository.findByIdOrNull.mockResolvedValue(resolvedTicket);
      ticketsRepository.update.mockResolvedValue({
        ...resolvedTicket,
        status: TicketStatus.OPEN,
      });
      ticketRepliesRepository.create.mockResolvedValue({
        id: 'reply-1',
        ticketId,
        message: 'Follow up',
        senderType: TicketReplySender.CLIENT,
      });

      await service.addReply(
        tenantId,
        ticketId,
        { message: 'Follow up' } as any,
        TicketReplySender.CLIENT,
        userId,
        'Test User',
      );

      expect(ticketsRepository.update).toHaveBeenCalledWith(
        ticketId,
        { status: TicketStatus.OPEN },
        expect.any(Object),
      );
    });

    it('should NOT reopen when AGENT replies to a RESOLVED ticket', async () => {
      const resolvedTicket = { ...mockTicket, status: TicketStatus.RESOLVED };
      ticketsRepository.findByIdOrNull.mockResolvedValue(resolvedTicket);
      ticketRepliesRepository.create.mockResolvedValue({
        id: 'reply-1',
        ticketId,
        message: 'Agent note',
        senderType: TicketReplySender.AGENT,
      });

      await service.addReply(
        tenantId,
        ticketId,
        { message: 'Agent note' } as any,
        TicketReplySender.AGENT,
        userId,
      );

      expect(ticketsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      ticketsRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.addReply(
          tenantId,
          ticketId,
          { message: 'Reply' } as any,
          TicketReplySender.CLIENT,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('should update ticket status/priority/assignee', async () => {
      const dto = {
        status: TicketStatus.IN_PROGRESS,
        priority: TicketPriority.HIGH,
        assignedTo: 'agent-1',
        assignedToName: 'Agent One',
      };

      const updatedTicket = { ...mockTicket, ...dto };
      ticketsRepository.update.mockResolvedValue(updatedTicket);

      const result = await service.update(tenantId, ticketId, dto as any);

      expect(ticketsRepository.update).toHaveBeenCalledWith(
        ticketId,
        expect.objectContaining({
          status: TicketStatus.IN_PROGRESS,
          priority: TicketPriority.HIGH,
          assignedTo: 'agent-1',
          assignedToName: 'Agent One',
        }),
        expect.any(Object),
      );
      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
    });
  });

  describe('getStats()', () => {
    it('should return correct counts by status', async () => {
      ticketsRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(4) // open
        .mockResolvedValueOnce(3) // in_progress
        .mockResolvedValueOnce(2) // resolved
        .mockResolvedValueOnce(1); // closed

      const result = await service.getStats(tenantId);

      expect(result).toEqual({
        total: 10,
        open: 4,
        inProgress: 3,
        resolved: 2,
        closed: 1,
      });
    });
  });

  describe('getAdminStats()', () => {
    it('should return total by status, avg resolution time, by priority, open >48h', async () => {
      const statusValues = Object.values(TicketStatus);
      const priorityValues = Object.values(TicketPriority);

      // Status counts
      for (let i = 0; i < statusValues.length; i++) {
        ticketsRepository.count.mockResolvedValueOnce(i + 1);
      }
      // Priority counts
      for (let i = 0; i < priorityValues.length; i++) {
        ticketsRepository.count.mockResolvedValueOnce((i + 1) * 10);
      }

      // Avg resolution time
      ticketsRepository.rawQuery.mockResolvedValue([{ avg_hours: '24.50' }]);

      // Open >48h count
      ticketsRepository.count.mockResolvedValueOnce(5);

      const result = await service.getAdminStats();

      expect(result.totalByStatus).toBeDefined();
      expect(result.avgResolutionTimeHours).toBe(24.5);
      expect(result.ticketsByPriority).toBeDefined();
      expect(result.openTicketsOlderThan48h).toBe(5);
    });

    it('should return null avgResolutionTimeHours when no resolved tickets', async () => {
      ticketsRepository.count.mockResolvedValue(0);
      ticketsRepository.rawQuery.mockResolvedValue([{ avg_hours: null }]);

      const result = await service.getAdminStats();

      expect(result.avgResolutionTimeHours).toBeNull();
    });
  });

  describe('findById()', () => {
    it('should return ticket when found', async () => {
      ticketsRepository.findByIdOrNull.mockResolvedValue(mockTicket);

      const result = await service.findById(tenantId, ticketId);

      expect(result).toEqual(mockTicket);
    });

    it('should throw NotFoundException when not found', async () => {
      ticketsRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(service.findById(tenantId, ticketId)).rejects.toThrow(NotFoundException);
    });
  });
});
