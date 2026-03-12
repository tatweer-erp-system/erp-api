import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { LeadsRepository } from '@/database/sql/repositories/leads.repository';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { IEventHandler, OutboxEventPayload } from './event-handler.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LeadEventHandler implements IEventHandler {
  private readonly logger = new Logger(LeadEventHandler.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly leadsRepository: LeadsRepository,
    private readonly salesOrdersRepository: SalesOrdersRepository,
  ) {}

  async handle(event: OutboxEventPayload): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

    switch (event.event_type) {
      case 'lead.won':
        await this.handleWon(event.tenant_id, payload);
        break;
      default:
        this.logger.warn(`Unhandled lead event type: ${event.event_type}`);
    }
  }

  private async handleWon(tenantId: string, payload: Record<string, unknown>): Promise<void> {
    const leadId = payload.leadId as string;
    const autoCreateOrder = payload.autoCreateOrder as boolean | undefined;

    if (!autoCreateOrder) {
      this.logger.log(`Lead ${leadId} won, auto-create order not requested, skipping`);
      return;
    }

    const lead = await this.leadsRepository.findOneById(tenantId, leadId);
    if (!lead) {
      this.logger.warn(`Lead ${leadId} not found in tenant ${tenantId}`);
      return;
    }

    const contactId = lead.contact_id;
    if (!contactId) {
      this.logger.warn(`Lead ${leadId} has no contact, cannot create draft sales order`);
      return;
    }

    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const transaction = await sequelize.transaction();

    try {
      // Generate a draft order number
      const orderNumber = `SO-DRAFT-${Date.now()}`;
      const orderId = uuidv4();
      const zatcaUUID = uuidv4();

      await this.salesOrdersRepository.insertOrder(
        tenantId,
        {
          id: orderId,
          orderNumber,
          contactId,
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          notes: `Auto-created from lead ${leadId}`,
          invoiceType: 'standard',
          transactionType: 'invoice',
          supplyType: 'goods',
          taxCategory: 'S',
          zatcaUUID,
          zatcaInvoiceCounter: 0,
          createdBy: (payload.userId as string) ?? null,
        },
        transaction,
      );

      await transaction.commit();
      this.logger.log(
        `Draft sales order ${orderId} created from lead ${leadId} for tenant ${tenantId}`,
      );
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
