import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthenticatedRequest } from '../types/request.types';
import * as bcrypt from 'bcrypt';

interface ApiKeyRecord {
  id: string;
  tenant_slug: string;
  name: string;
  key_hash: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantSequelizeService: TenantSequelizeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = request.headers['x-api-key'] as string;

    // If no API key header, let JWT guard handle authentication
    if (!apiKey) {
      return true;
    }

    const tenantSlug =
      request.tenantSlug ||
      (request.headers['x-tenant-slug'] as string) ||
      this.extractTenantFromUrl(request);

    if (!tenantSlug) {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: 'TENANT_REQUIRED',
        message: 'Tenant slug is required for API key authentication',
      });
    }

    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [results] = await sequelize.query(
      `SELECT id, tenant_slug, name, key_hash, scopes, last_used_at, expires_at, revoked, created_at, updated_at, deleted_at
       FROM "${tenantSlug}".api_keys
       WHERE deleted_at IS NULL AND revoked = false`,
      {
        replacements: {},
      },
    );

    const apiKeys = results as ApiKeyRecord[];

    let matchedKey: ApiKeyRecord | null = null;

    for (const record of apiKeys) {
      const isMatch = await bcrypt.compare(apiKey, record.key_hash);
      if (isMatch) {
        matchedKey = record;
        break;
      }
    }

    if (!matchedKey) {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: 'INVALID_API_KEY',
        message: 'Invalid API key',
      });
    }

    // Check expiration
    if (matchedKey.expires_at && new Date(matchedKey.expires_at) < new Date()) {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: 'API_KEY_EXPIRED',
        message: 'API key has expired',
      });
    }

    // Check scopes against required permissions
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredPermissions && requiredPermissions.length > 0) {
      const scopes = matchedKey.scopes || [];
      const hasAllPermissions = requiredPermissions.every((perm) => scopes.includes(perm));

      if (!hasAllPermissions) {
        throw new UnauthorizedException({
          statusCode: 401,
          errorCode: 'INSUFFICIENT_SCOPES',
          message: 'API key does not have the required scopes',
          requiredScopes: requiredPermissions,
          availableScopes: scopes,
        });
      }
    }

    // Update last_used_at asynchronously (fire and forget)
    sequelize
      .query(`UPDATE "${tenantSlug}".api_keys SET last_used_at = NOW() WHERE id = :id`, {
        replacements: { id: matchedKey.id },
      })
      .catch(() => {
        // Silently ignore update errors
      });

    // Attach user-like object to request
    (request as any).user = {
      id: `apikey:${matchedKey.id}`,
      tenantSlug,
      name: matchedKey.name,
      isApiKey: true,
      scopes: matchedKey.scopes || [],
    };

    request.tenantSlug = tenantSlug;

    return true;
  }

  private extractTenantFromUrl(request: AuthenticatedRequest): string | null {
    const match = request.url?.match(/\/tenants\/([^/]+)/);
    return match ? match[1] : null;
  }
}
