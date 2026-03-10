import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { PurchaseOrderLine } from '../../../database/entities/purchase-order-line.entity';

@Injectable()
export class PurchaseOrderLinesRepository extends BaseRepository<PurchaseOrderLine> {
  constructor() {
    super(PurchaseOrderLine);
  }

  async findByOrderId(orderId: string): Promise<PurchaseOrderLine[]> {
    return this.findAllRaw({
      where: { orderId },
    });
  }
}
