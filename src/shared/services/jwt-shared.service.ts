import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtSharedService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(payload: object): string {
    return this.jwtService.sign(
      { ...payload },
      {
        expiresIn: this.configService.get<string>('jwt.expiresIn'),
      },
    );
  }

  signRefreshToken(payload: object): string {
    return this.jwtService.sign(
      { ...payload },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      },
    );
  }

  getRefreshExpiresIn(): string {
    return this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
  }

  verify<T extends object = Record<string, unknown>>(token: string): T {
    return this.jwtService.verify<T>(token);
  }

  verifyRefreshToken<T extends object = Record<string, unknown>>(token: string): T {
    return this.jwtService.verify<T>(token, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
    });
  }

  decode<T extends object = Record<string, unknown>>(token: string): T {
    return this.jwtService.decode<T>(token);
  }
}
