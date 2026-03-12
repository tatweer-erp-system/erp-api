import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../base.repository';
import { Ticket } from '../../../modules/tickets/entities/ticket.entity';

@Injectable()
export class TicketsRepository extends TenantAwareRepository<Ticket> {
  constructor() {
    super(Ticket);
  }

  async findByStatus(status: string, tenantId: string): Promise<Ticket[]> {
    return this.findAllRaw({ where: { status }, tenantId });
  }
}
