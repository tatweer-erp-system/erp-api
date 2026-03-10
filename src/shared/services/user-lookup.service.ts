import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/tenant-sequelize.service';
import { CacheService, CACHE_TTL } from '@/infrastructure/cache/cache.service';

export interface LookedUpUser {
  id: string;
  email: string;
  firstNameEn: string;
  lastNameEn: string;
  isActive: boolean;
}

@Injectable()
export class UserLookupSharedService {
  private readonly logger = new Logger(UserLookupSharedService.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly cacheService: CacheService,
  ) {}

  async getUserById(tenantSlug: string, userId: string): Promise<LookedUpUser | null> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [results] = await sequelize.query(
      `SELECT id, email, first_name->>'en' as "firstNameEn", last_name->>'en' as "lastNameEn", is_active as "isActive"
       FROM users WHERE id = :userId AND deleted_at IS NULL`,
      { replacements: { userId } },
    );
    return (results as LookedUpUser[])[0] ?? null;
  }

  async getUserPermissions(tenantSlug: string, userId: string): Promise<string[]> {
    const cacheKey = this.cacheService.permissionKey(tenantSlug, userId);
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) return cached;

    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [results] = await sequelize.query(
      `SELECT DISTINCT p.slug
       FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id AND rp.deleted_at IS NULL
       INNER JOIN user_roles ur ON ur.role_id = rp.role_id AND ur.deleted_at IS NULL
       WHERE ur.user_id = :userId`,
      { replacements: { userId } },
    );
    const permissions = (results as { slug: string }[]).map((r) => r.slug);
    await this.cacheService.set(cacheKey, permissions, CACHE_TTL.permissions);
    return permissions;
  }

  async invalidatePermissionCache(tenantSlug: string, userId: string): Promise<void> {
    const cacheKey = this.cacheService.permissionKey(tenantSlug, userId);
    await this.cacheService.del(cacheKey);
  }
}
