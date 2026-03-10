import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { TenantSequelizeService } from '../../database/tenant-sequelize.service';
import type { PermissionString, ResolvedPermission } from '../types/permission.types';
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

    const { tenantSlug, id: userId } = user;
    const cacheKey = this.cacheService.permissionKey(tenantSlug, userId);

    let permissions = await this.cacheService.get<ResolvedPermission[]>(cacheKey);

    if (!permissions) {
      permissions = await this.loadPermissionsFromDb(tenantSlug, userId);
      await this.cacheService.set(cacheKey, permissions, 300);
    }

    for (const perm of required) {
      const [module, action] = perm.split(':');
      const hasPermission = permissions.some(
        (p) => p.module === module && (p.action === action || p.action === '*'),
      );
      if (!hasPermission) {
        throw new ForbiddenException(`Missing permission: ${perm}`);
      }
    }

    return true;
  }

  private async loadPermissionsFromDb(
    tenantSlug: string,
    userId: string,
  ): Promise<ResolvedPermission[]> {
    try {
      const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
      const results = await sequelize.query<{
        module: string;
        action: string;
        conditions: string;
      }>(
        `SELECT DISTINCT p.module, p.action, p.conditions
         FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         JOIN user_roles ur ON ur.role_id = rp.role_id
         WHERE ur.user_id = :userId
           AND p.deleted_at IS NULL`,
        { replacements: { userId }, type: 'SELECT' } as any,
      );
      return (results as unknown as any[]).map((r) => ({
        module: r.module,
        action: r.action,
        conditions: r.conditions ? JSON.parse(r.conditions as string) : null,
      }));
    } catch {
      return [];
    }
  }
}
