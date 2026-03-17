import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { Transaction } from 'sequelize';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { AuditContext } from '@/common/interfaces/repository.interface';
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
   *
   * Supports optional pricelistId and fiscalPositionId.
   * Uses partnerId for customer lookup (contactId is deprecated).
   */
  async createFromLead(
    tenantId: string,
    dto: {
      partnerId: string | null;
      /** @deprecated Use partnerId — kept for backward compatibility */
      contactId?: string;
      currencyId: string;
      notes?: string;
      branchId: string;
      /** Pricelist for order pricing rules */
      pricelistId?: string;
      /** Fiscal position for tax mapping */
      fiscalPositionId?: string;
    },
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ): Promise<{ id: string; orderNumber: string }> {
    const isOwner = !containerTransaction;
    const sequelize = await this.salesOrdersRepository.getSequelizeInstance(tenantId);
    const transaction = containerTransaction ?? (await sequelize.transaction());

    try {
      const id = uuidv7();
      const orderNumber = await this.sequencesService.nextNumber(
        tenantId,
        SequenceEntity.SALES_ORDER,
        dto.branchId,
      );

      // Resolve partner: prefer partnerId, fall back to contactId for backward compat
      const resolvedPartnerId = dto.partnerId ?? dto.contactId ?? null;

      await this.salesOrdersRepository.insertOrder(
        tenantId,
        {
          id,
          orderNumber,
          partnerId: resolvedPartnerId,
          branchId: dto.branchId,
          pricelistId: dto.pricelistId ?? null,
          paymentTermId: null,
          salespersonId: null,
          fiscalPositionId: dto.fiscalPositionId ?? null,
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          currencyId: dto.currencyId,
          exchangeRate: 1,
          totalAmountBase: 0,
          discountType: null,
          discountValue: null,
          notes: dto.notes ?? null,
          createdBy: auditContext.userId ?? null,
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
