import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { LeadsRepository } from '@/database/sql/repositories/leads.repository';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { IEventHandler, OutboxEventPayload } from './event-handler.interface';
import { v7 as uuidv7 } from 'uuid';
import { InvoiceType, TransactionType, SupplyType, TaxCategory } from '@/common/enums/crm.enums';

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

    switch (event.eventType) {
      case 'lead.won':
        await this.handleWon(event.tenantId, payload);
        break;
      default:
        this.logger.warn(`Unhandled lead event type: ${event.eventType}`);
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

    const contactId = lead.contactId;
    if (!contactId) {
      this.logger.warn(`Lead ${leadId} has no contact, cannot create draft sales order`);
      return;
    }

    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const transaction = await sequelize.transaction();

    try {
      // Generate a draft order number
      const orderNumber = `SO-DRAFT-${Date.now()}`;
      const orderId = uuidv7();
      const zatcaUUID = uuidv7();

      await this.salesOrdersRepository.insertOrder(
        tenantId,
        {
          id: orderId,
          orderNumber,
          partnerId: contactId,
          branchId: null,
          pricelistId: null,
          paymentTermId: null,
          salespersonId: null,
          fiscalPositionId: null,
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          totalAmountBase: 0,
          exchangeRate: 1,
          currencyId: null,
          discountType: null,
          discountValue: null,
          notes: `Auto-created from lead ${leadId}`,
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
