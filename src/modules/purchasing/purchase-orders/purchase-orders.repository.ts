import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { PurchaseOrder } from '../../../database/entities/purchase-order.entity';

@Injectable()
export class PurchaseOrdersRepository extends BaseRepository<PurchaseOrder> {
  constructor() {
    super(PurchaseOrder);
  }
}
