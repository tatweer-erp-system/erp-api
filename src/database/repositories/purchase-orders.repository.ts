import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PurchaseOrder } from '../entities/purchase-order.entity';

@Injectable()
export class PurchaseOrdersRepository extends BaseRepository<PurchaseOrder> {
  constructor() {
    super(PurchaseOrder);
  }
}
