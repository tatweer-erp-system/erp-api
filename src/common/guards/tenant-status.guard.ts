import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedRequest } from '../types/request.types';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { CacheService } from '@/infrastructure/cache/cache.service';

interface TenantStatus {
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  trialEndsAt: string | null;
  suspendedAt: string | null;
  suspendReason: string | null;
  cancelledAt: string | null;
}

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantSlug = request.tenantSlug;

    // Super admin routes bypass — no tenantSlug on request
    if (!tenantSlug) {
      return true;
    }

    const tenant = await this.getTenantStatus(tenantSlug);

    if (!tenant) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'TENANT_NOT_FOUND',
        message: 'Tenant not found',
      });
    }

    switch (tenant.status) {
      case 'suspended':
        throw new ForbiddenException({
          statusCode: 403,
          errorCode: 'TENANT_SUSPENDED',
          message: 'Tenant account is suspended',
          suspendedAt: tenant.suspendedAt,
          suspendReason: tenant.suspendReason,
        });

      case 'cancelled':
        throw new ForbiddenException({
          statusCode: 403,
          errorCode: 'TENANT_CANCELLED',
          message: 'Tenant account is cancelled',
          cancelledAt: tenant.cancelledAt,
        });

      case 'trial':
        if (tenant.trialEndsAt && new Date(tenant.trialEndsAt) < new Date()) {
          throw new ForbiddenException({
            statusCode: 403,
            errorCode: 'TRIAL_EXPIRED',
            message: 'Tenant trial period has expired',
            trialEndsAt: tenant.trialEndsAt,
          });
        }
        return true;

      case 'active':
      default:
        return true;
    }
  }

  private async getTenantStatus(tenantSlug: string): Promise<TenantStatus | null> {
    const cacheKey = `tenant:status:${tenantSlug}`;

    const cached = await this.cacheService.get<TenantStatus>(cacheKey);
    if (cached) {
      return cached;
    }

    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [results] = await sequelize.query(
      `SELECT status, "trialEndsAt", "suspendedAt", "suspendReason", "cancelledAt"
       FROM public.tenants
       WHERE slug = :tenantSlug
       LIMIT 1`,
      {
        replacements: { tenantSlug },
      },
    );

    const tenant = (results as unknown as TenantStatus[])[0] || null;

    if (tenant) {
      await this.cacheService.set(cacheKey, tenant, 300);
    }

    return tenant;
  }
}
