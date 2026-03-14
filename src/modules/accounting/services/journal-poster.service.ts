import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { AuditContext } from '@/common/interfaces/repository.interface';
import {
  JournalPosterSharedService,
  GenericJournalPostData,
  PosOrderPostData,
  PayrollPostData,
  TreasuryPostData,
} from '@/shared/services/journal-poster-shared.service';

/**
 * Module-level delegate — all logic lives in JournalPosterSharedService.
 * Kept for backward compatibility with existing AccountingModule exports.
 */
@Injectable()
export class JournalPosterService {
  constructor(private readonly shared: JournalPosterSharedService) {}

  async post(
    tenantId: string,
    data: GenericJournalPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    return this.shared.post(tenantId, data, auditContext, containerTransaction);
  }

  async postPosOrder(
    tenantId: string,
    orderId: string,
    data: PosOrderPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    return this.shared.postPosOrder(tenantId, orderId, data, auditContext, containerTransaction);
  }

  async postPayroll(
    tenantId: string,
    payrollRunId: string,
    data: PayrollPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    return this.shared.postPayroll(
      tenantId,
      payrollRunId,
      data,
      auditContext,
      containerTransaction,
    );
  }

  async postTreasuryReceipt(
    tenantId: string,
    data: TreasuryPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    return this.shared.postTreasuryReceipt(tenantId, data, auditContext, containerTransaction);
  }

  async postTreasuryPayment(
    tenantId: string,
    data: TreasuryPostData,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    return this.shared.postTreasuryPayment(tenantId, data, auditContext, containerTransaction);
  }
}
