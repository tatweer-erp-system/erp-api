import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { TenantSequelizeService } from '../../database/sql/tenant-sequelize.service';
import { resolvePermissions } from '../constants/permissions';
import type { PermissionString } from '../types/permission.types';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
    private readonly tenantSequelizeService: TenantSequelizeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionString[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = (request as any).user;
    if (!user) throw new ForbiddenException('No authenticated user');

    const { tenantSlug, tenantId, id: userId } = user;
    const cacheKey = this.cacheService.permissionKey(tenantSlug, userId);

    let permissions = await this.cacheService.get<string[]>(cacheKey);

    if (!permissions) {
      permissions = await this.loadPermissions(tenantId, userId);
      await this.cacheService.set(cacheKey, permissions, 300);
    }

    // Cache computed permissions on the request object for the duration of the request
    (request as any)._effectivePermissions = permissions;

    for (const perm of required) {
      if (!permissions.includes(perm)) {
        throw new ForbiddenException(`Missing permission: ${perm}`);
      }
    }

    return true;
  }

  /**
   * Loads user permissions from DB using the new RBAC model:
   * 1. Get all role_permissions for user's roles via user_roles junction
   * 2. Get user's extra_permissions and revoked_permissions
   * 3. Compute effective permissions
   */
  private async loadPermissions(tenantId: string, userId: string): Promise<string[]> {
    try {
      const sequelize = this.tenantSequelizeService.getSharedSequelize();

      // 1. Get all permissions from user's roles via role_permissions
      const [rolePermRows] = await sequelize.query(
        `SELECT DISTINCT CONCAT(p.module, ':', p.action) as permission
         FROM user_roles ur
         JOIN role_permissions rp ON rp.role_id = ur.role_id AND rp.tenant_id = ur.tenant_id
         JOIN permissions p ON p.id = rp.permission_id AND p.deleted_at IS NULL
         WHERE ur.user_id = :userId AND ur.tenant_id = :tenantId`,
        { replacements: { userId, tenantId } },
      );

      const rolePermissions = (rolePermRows as any[]).map((r: any) => r.permission);

      // 2. Get user's extra_permissions and revoked_permissions
      const [userRows] = await sequelize.query(
        `SELECT extra_permissions, revoked_permissions
         FROM users
         WHERE id = :userId AND tenant_id = :tenantId AND deleted_at IS NULL
         LIMIT 1`,
        { replacements: { userId, tenantId } },
      );

      const user = (userRows as any[])?.[0];
      const extraPermissions: string[] = user?.extra_permissions || [];
      const revokedPermissions: string[] = user?.revoked_permissions || [];

      // 3. Compute effective permissions
      return resolvePermissions(rolePermissions, extraPermissions, revokedPermissions);
    } catch {
      // Fallback: return empty permissions if DB query fails
      return [];
    }
  }
}
