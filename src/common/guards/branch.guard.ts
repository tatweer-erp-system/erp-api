import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { TenantSequelizeService } from '../../database/sql/tenant-sequelize.service';
import { AuthenticatedRequest } from '../types/request.types';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

const BRANCH_HEADER = 'x-branch-id';
const CACHE_TTL = 300; // 5 minutes

/**
 * Validates that the authenticated user has access to the branch
 * specified in the `x-branch-id` request header.
 *
 * - Reads `x-branch-id` from the request header
 * - Checks user_branches table (with cache) to confirm access
 * - Sets `request.branchId` for downstream use
 * - Skips validation for @Public() routes
 */
@Injectable()
export class BranchGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
    private readonly tenantSequelizeService: TenantSequelizeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) return true; // Let JwtAuthGuard handle missing user

    const branchId = request.headers[BRANCH_HEADER] as string | undefined;

    if (!branchId) {
      // No branch header — allow request but don't set branchId
      // Some endpoints (e.g. settings, profile) don't require a branch
      return true;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(branchId)) {
      throw new BadRequestException(msg(ErrorMessages.BRANCH_INVALID_HEADER, branchId));
    }

    // Check cache first
    const cacheKey = `branch:access:${user.tenantId}:${user.id}`;
    let allowedBranches = await this.cacheService.get<string[]>(cacheKey);

    if (!allowedBranches) {
      allowedBranches = await this.loadUserBranches(user.tenantId, user.id);
      await this.cacheService.set(cacheKey, allowedBranches, CACHE_TTL);
    }

    if (!allowedBranches.includes(branchId)) {
      throw new ForbiddenException(msg(ErrorMessages.BRANCH_ACCESS_DENIED));
    }

    // Set branchId on request for downstream decorators/services
    (request as any).branchId = branchId;

    return true;
  }

  private async loadUserBranches(tenantId: string, userId: string): Promise<string[]> {
    try {
      const sequelize = this.tenantSequelizeService.getSharedSequelize();
      const [rows] = await sequelize.query(
        `SELECT "branchId" FROM user_branches
         WHERE "userId" = :userId AND "tenantId" = :tenantId`,
        { replacements: { userId, tenantId } },
      );
      return (rows as { branchId: string }[]).map((r) => r.branchId);
    } catch {
      return [];
    }
  }
}
