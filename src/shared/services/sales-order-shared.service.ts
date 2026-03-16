import { Injectable } from '@nestjs/common';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { SalesOrderStatus } from '@/common/enums/sales.enums';

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
    branchId: string,
    dto: {
      customerId?: string;
      contactId?: string;
      currencyId?: string;
      notes?: string;
      branchId?: string;
      [key: string]: any;
    },
    auditContext: AuditContext,
  ): Promise<{ id: string }> {
    const order = await this.salesOrdersRepository.create({
      branchId,
      customerId: dto.customerId,
      notes: dto.notes ?? null,
      status: SalesOrderStatus.DRAFT,
      createdBy: auditContext.userId ?? null,
    });

    return { id: order.id };
  }
}
