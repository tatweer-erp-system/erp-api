import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class SuperAdminIpGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedIps = this.configService.get<string[]>('app.superAdminIps') ?? ['127.0.0.1'];
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.socket.remoteAddress ||
      '';

    if (!allowedIps.includes(clientIp)) {
      throw new ForbiddenException('Access restricted');
    }
    return true;
  }
}
