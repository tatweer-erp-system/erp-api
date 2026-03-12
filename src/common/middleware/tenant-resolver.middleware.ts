import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  use(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('jwt.secret'),
        });
        req.tenantSlug = payload.tenantSlug;
        req.tenantId = payload.tenantId;
      } catch {
        // Token will fail in JwtAuthGuard; just skip here
      }
    }
    next();
  }
}
