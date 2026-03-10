import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { AuthenticatedRequest } from '../types/request.types';
import { FeatureFlagSharedService } from '@/shared/services/feature-flag-shared.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagService: FeatureFlagSharedService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredFeature = this.reflector.getAllAndOverride<string>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantSlug = request.tenantSlug;

    if (!tenantSlug) {
      return true;
    }

    const isEnabled = await this.featureFlagService.isEnabled(tenantSlug, requiredFeature);

    if (!isEnabled) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'FEATURE_NOT_ENABLED',
        message: `Feature '${requiredFeature}' is not enabled for this tenant`,
        feature: requiredFeature,
      });
    }

    return true;
  }
}
