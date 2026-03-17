import { Injectable } from '@nestjs/common';
import { BranchProductsRepository } from '@/database/sql/repositories/branch-products.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';

@Injectable()
export class BranchProductsService {
  constructor(
    private readonly branchProductsRepository: BranchProductsRepository,
    private readonly auditService: AuditSharedService,
  ) {}

  async getAssigned(tenantId: string, branchId: string) {
    return this.branchProductsRepository.findByBranch(tenantId, branchId);
  }

  async assign(
    tenantId: string,
    branchId: string,
    productIds: string[],
    auditContext: AuditContext,
  ) {
    const count = await this.branchProductsRepository.bulkAssign(
      tenantId,
      branchId,
      productIds,
      auditContext.userId ?? null,
    );

    await this.auditService.logCreate(
      tenantId,
      'inventory.branch_products',
      branchId,
      { branchId, productIds, assigned: count },
      auditContext.userId,
    );

    return { assigned: count };
  }

  async unassign(
    tenantId: string,
    branchId: string,
    productIds: string[],
    auditContext: AuditContext,
  ) {
    const count = await this.branchProductsRepository.bulkUnassign(
      tenantId,
      branchId,
      productIds,
      auditContext.userId ?? null,
    );

    await this.auditService.logDelete(
      tenantId,
      'inventory.branch_products',
      branchId,
      { branchId, productIds, unassigned: count },
      auditContext.userId,
    );

    return { unassigned: count };
  }
}
