import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../base.repository';
import { TicketReply } from '../../../modules/tickets/entities/ticket-reply.entity';

@Injectable()
export class TicketRepliesRepository extends TenantAwareRepository<TicketReply> {
  constructor() {
    super(TicketReply);
  }
}
