import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketReply } from '@/database/sql/entities/ticket-reply.entity';
import { TicketReplySender } from '@/common/enums/ticket.enums';

@Injectable()
export class TicketRepliesRepository {
  constructor(
    @InjectRepository(TicketReply)
    private readonly repo: Repository<TicketReply>,
  ) {}

  async findByTicket(ticketId: string): Promise<TicketReply[]> {
    return this.repo.find({
      where: { ticketId, deletedAt: null } as any,
      order: { createdAt: 'ASC' },
    });
  }

  async create(
    data: Partial<TicketReply>,
    opts?: { tenantId?: string; bypassTenantScope?: boolean },
  ): Promise<TicketReply> {
    const entity = this.repo.create({
      ticketId: (data as any).ticketId,
      userId: (data as any).userId ?? null,
      userName: (data as any).userName ?? null,
      senderType: (data as any).senderType ?? TicketReplySender.AGENT,
      message: (data as any).message,
      isInternal: (data as any).isInternal ?? false,
      createdBy: (data as any).userId ?? null,
    });
    return this.repo.save(entity);
  }
}
