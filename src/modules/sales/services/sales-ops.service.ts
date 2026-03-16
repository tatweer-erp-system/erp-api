import { Injectable } from '@nestjs/common';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { DeliveriesRepository } from '@/database/sql/repositories/deliveries.repository';
import { SalesOrder } from '@/database/sql/entities/sales-order.entity';
import { SalesOrderLine } from '@/database/sql/entities/sales-order-line.entity';
import { Delivery } from '@/database/sql/entities/delivery.entity';
import { DeliveryLine } from '@/database/sql/entities/delivery-line.entity';
import { SalesOrderStatus, SalesInvoiceStatus, DeliveryStatus } from '@/common/enums/sales.enums';

@Injectable()
export class SalesOpsService {
  constructor(
    private readonly salesOrdersRepo: SalesOrdersRepository,
    private readonly deliveriesRepo: DeliveriesRepository,
  ) {}

  // ── Sales Orders ──────────────────────────────────────────────────────────

  findAllOrders(
    branchId: string,
    filters: {
      status?: SalesOrderStatus;
      customerId?: string;
      invoiceStatus?: SalesInvoiceStatus;
    } = {},
    page = 1,
    limit = 20,
  ) {
    return this.salesOrdersRepo.findAll(branchId, filters, page, limit);
  }

  findOrderById(id: string): Promise<SalesOrder> {
    return this.salesOrdersRepo.findById(id);
  }

  findOrderWithLines(id: string) {
    return this.salesOrdersRepo.findWithLines(id);
  }

  createOrder(data: Partial<SalesOrder>): Promise<SalesOrder> {
    return this.salesOrdersRepo.create(data);
  }

  updateOrder(id: string, version: number, data: Partial<SalesOrder>): Promise<SalesOrder> {
    return this.salesOrdersRepo.update(id, version, data);
  }

  upsertOrderLines(orderId: string, lines: Partial<SalesOrderLine>[]) {
    return this.salesOrdersRepo.upsertLines(orderId, lines);
  }

  confirmOrder(id: string): Promise<SalesOrder> {
    return this.salesOrdersRepo.confirm(id);
  }

  cancelOrder(id: string): Promise<SalesOrder> {
    return this.salesOrdersRepo.cancel(id);
  }

  removeOrder(id: string): Promise<void> {
    return this.salesOrdersRepo.softDelete(id);
  }

  // ── Deliveries ────────────────────────────────────────────────────────────

  findAllDeliveries(
    branchId: string,
    filters: { status?: DeliveryStatus; salesOrderId?: string } = {},
    page = 1,
    limit = 20,
  ) {
    return this.deliveriesRepo.findAll(branchId, filters, page, limit);
  }

  findDeliveryById(id: string): Promise<Delivery> {
    return this.deliveriesRepo.findById(id);
  }

  findDeliveryWithLines(id: string) {
    return this.deliveriesRepo.findWithLines(id);
  }

  createDelivery(data: Partial<Delivery>): Promise<Delivery> {
    return this.deliveriesRepo.create(data);
  }

  updateDelivery(id: string, version: number, data: Partial<Delivery>): Promise<Delivery> {
    return this.deliveriesRepo.update(id, version, data);
  }

  upsertDeliveryLines(deliveryId: string, lines: Partial<DeliveryLine>[]) {
    return this.deliveriesRepo.upsertLines(deliveryId, lines);
  }

  doneDelivery(id: string): Promise<Delivery> {
    return this.deliveriesRepo.done(id);
  }

  removeDelivery(id: string): Promise<void> {
    return this.deliveriesRepo.softDelete(id);
  }
}
