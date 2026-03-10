import { Injectable } from '@nestjs/common';
import { CacheService } from '../../infrastructure/cache/cache.service';

@Injectable()
export class PermissionCacheService {
  constructor(private readonly cacheService: CacheService) {}

  async invalidateUserPermissions(tenantSlug: string, userId: string): Promise<void> {
    const key = this.cacheService.permissionKey(tenantSlug, userId);
    await this.cacheService.del(key);
  }

  async invalidateRolePermissions(
    tenantSlug: string,
    roleId: string,
    sequelize: any,
  ): Promise<void> {
    const [users] = await sequelize.query(
      `SELECT user_id FROM user_roles WHERE role_id = :roleId`,
      { replacements: { roleId }, type: 'SELECT' } as any,
    );
    for (const row of users as any[]) {
      await this.invalidateUserPermissions(tenantSlug, row.user_id);
    }
  }
}
