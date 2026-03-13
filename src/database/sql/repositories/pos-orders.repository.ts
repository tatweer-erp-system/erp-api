import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PosOrder } from '../entities/pos-order.entity';

@Injectable()
export class PosOrdersRepository extends BaseRepository<PosOrder> {
  constructor() {
    super(PosOrder, true);
  }
}
