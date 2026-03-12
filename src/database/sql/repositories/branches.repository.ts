import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { TenantAwareRepository } from '../base.repository';
import { Branch } from '../entities/branch.entity';

@Injectable()
export class BranchesRepository extends TenantAwareRepository<Branch> {
  constructor() {
    super(Branch);
  }

  async existsByCode(code: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const where: Record<string, unknown> = { code };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    const record = await this.findOne({ where, tenantId });
    return !!record;
  }
}
