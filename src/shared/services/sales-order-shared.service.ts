import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { AuditContext } from '@/common/interfaces/repository.interface';
import {
  SalesOrderStatus,
  ZatcaTransactionType,
  ZatcaInvoiceType,
  ZatcaStatus,
  ZatcaTaxCategory,
  SupplyType,
} from '@/common/enums/crm.enums';
import { SequenceEntity } from '@/common/enums/sequence.enums';

@Injectable()
export class SalesOrderSharedService {
  constructor(
    private readonly salesOrdersRepository: SalesOrdersRepository,
    private readonly sequencesService: SequencesService,
  ) {}

  /**
   * Creates a draft sales order from a CRM lead.
   * Used by CrmModule when a lead is marked as won.
   */
  async createFromLead(
    tenantId: string,
    dto: { contactId: string; currencyId: string; notes?: string; branchId: string },
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<{ id: string; orderNumber: string }> {
    const isOwner = !containerTransaction;
    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = containerTransaction ?? (await sequelize.transaction());

    try {
      const id = uuidv4();
      const orderNumber = await this.sequencesService.nextNumber(
        tenantId,
        SequenceEntity.SALES_ORDER,
        dto.branchId,
      );

      await this.salesOrdersRepository.insertOrder(
        tenantId,
        {
          id,
          orderNumber,
          contactId: dto.contactId,
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          notes: dto.notes ?? null,
          invoiceType: ZatcaInvoiceType.SIMPLIFIED,
          transactionType: ZatcaTransactionType.SALE,
          supplyType: SupplyType.GOODS,
          taxCategory: ZatcaTaxCategory.S,
          zatcaUUID: uuidv4(),
          zatcaInvoiceCounter: 0,
          createdBy: auditContext.userId ?? null,
        },
        transaction,
      );

      await this.salesOrdersRepository.updateOrder(
        tenantId,
        id,
        ['"currencyId" = :currencyId', '"totalAmountBase" = 0', '"zatcaStatus" = :zatcaStatus'],
        {
          id,
          currencyId: dto.currencyId,
          zatcaStatus: ZatcaStatus.NOT_REQUIRED,
        },
        transaction,
      );

      if (isOwner) await transaction.commit();
      return { id, orderNumber };
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }
}
