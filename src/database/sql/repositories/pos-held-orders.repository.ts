import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PosHeldOrder } from '../entities/pos-held-order.entity';

@Injectable()
export class PosHeldOrdersRepository extends BaseRepository<PosHeldOrder> {
  constructor() {
    super(PosHeldOrder, true);
  }
}
