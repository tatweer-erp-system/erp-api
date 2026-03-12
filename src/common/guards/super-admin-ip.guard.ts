import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class SuperAdminIpGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedIps = this.configService.get<string[]>('app.superAdminIps') ?? ['127.0.0.1'];
    const request = context.switchToHttp().getRequest<Request>();
    const rawIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.socket.remoteAddress ||
      '';

    // Normalize IPv6 loopback and IPv4-mapped IPv6 addresses
    const clientIp = this.normalizeIp(rawIp);
    const normalizedAllowed = allowedIps.map((ip) => this.normalizeIp(ip));

    if (!normalizedAllowed.includes(clientIp)) {
      throw new ForbiddenException('Access restricted');
    }
    return true;
  }

  private normalizeIp(ip: string): string {
    // ::ffff:127.0.0.1 → 127.0.0.1
    if (ip.startsWith('::ffff:')) return ip.slice(7);
    // ::1 → 127.0.0.1
    if (ip === '::1') return '127.0.0.1';
    return ip;
  }
}
