import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PosOrderItem } from '../entities/pos-order-item.entity';

@Injectable()
export class PosOrderItemsRepository extends BaseRepository<PosOrderItem> {
  constructor() {
    super(PosOrderItem, false);
  }
}
