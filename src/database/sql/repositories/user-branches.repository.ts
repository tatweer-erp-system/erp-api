import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { UserBranch } from '../entities/user-branch.entity';

@Injectable()
export class UserBranchesRepository extends BaseRepository<UserBranch> {
  constructor() {
    super(UserBranch, false); // Not tenant-scoped via BaseRepository - uses explicit tenantId in queries
  }

  async findByUserAndTenant(userId: string, tenantId: string): Promise<UserBranch[]> {
    const result = await this.findAll({
      where: { userId, tenantId } as any,
      limit: 100,
      page: 1,
    });
    return result.data;
  }

  async findDefaultBranch(userId: string, tenantId: string): Promise<UserBranch | null> {
    return this.findOne({
      where: { userId, tenantId, isDefault: true } as any,
    });
  }
}
