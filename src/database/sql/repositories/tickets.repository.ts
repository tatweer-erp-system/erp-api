import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Ticket } from '../../../modules/tickets/entities/ticket.entity';

@Injectable()
export class TicketsRepository extends BaseRepository<Ticket> {
  constructor() {
    super(Ticket, true);
  }

  async findByStatus(status: string, tenantId: string): Promise<Ticket[]> {
    return this.findAllRaw({ where: { status }, tenantId });
  }
}
