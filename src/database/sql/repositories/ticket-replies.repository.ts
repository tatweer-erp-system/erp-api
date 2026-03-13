import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { TicketReply } from '../../../modules/tickets/entities/ticket-reply.entity';

@Injectable()
export class TicketRepliesRepository extends BaseRepository<TicketReply> {
  constructor() {
    super(TicketReply, true);
  }
}
