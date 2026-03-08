import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantSequelizeService } from '../../database/tenant-sequelize.service';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (user?.tenantSlug) {
      const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(
        user.tenantSlug,
      );
      await this.tenantSequelizeService.setSearchPath(sequelize, user.tenantSlug);
    }

    return next.handle();
  }
}
