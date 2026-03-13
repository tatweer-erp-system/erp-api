import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { KitchenTicket } from '../entities/kitchen-ticket.entity';

@Injectable()
export class KitchenTicketsRepository extends BaseRepository<KitchenTicket> {
  constructor() {
    super(KitchenTicket, true);
  }
}
