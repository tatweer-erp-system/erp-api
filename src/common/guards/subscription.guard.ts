import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_FEATURE_KEY } from '../decorators/module-feature.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedRequest } from '../types/request.types';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Check if the route requires a specific module feature
    const requiredModule = this.reflector.getAllAndOverride<string>(MODULE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No module restriction — allow
    if (!requiredModule) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { tenantSlug, user } = req;

    if (!tenantSlug || !user?.tenantId) return true;

    const allowedModules = await this.subscriptionsService.getSubscriptionModules(
      tenantSlug,
      user.tenantId,
    );

    if (!allowedModules.includes(requiredModule)) {
      throw new ForbiddenException(
        `Your current plan does not include the '${requiredModule}' module. ` +
          `Please upgrade your subscription to access this feature.`,
      );
    }

    return true;
  }
}
