import { Injectable } from '@nestjs/common';
import { CacheService } from '@/infrastructure/cache/cache.service';
import { RolesRepository } from '@/database/sql/repositories/roles.repository';

@Injectable()
export class PermissionCacheSharedService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async invalidateUserPermissions(tenantId: string, userId: string): Promise<void> {
    const key = this.cacheService.permissionKey(tenantId, userId);
    await this.cacheService.del(key);
  }

  async invalidateRolePermissions(tenantId: string, roleId: string): Promise<void> {
    const userIds = await this.rolesRepository.findUserIdsByRoleId(tenantId, roleId);
    for (const userId of userIds) {
      await this.invalidateUserPermissions(tenantId, userId);
    }
  }
}
