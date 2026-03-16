import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '@/database/sql/repositories/users.repository';
import { RefreshTokensRepository } from '@/database/sql/repositories/refresh-tokens.repository';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokensRepo: RefreshTokensRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user || !user.isActive)
      throw new UnauthorizedException({ en: 'Invalid credentials', ar: 'بيانات الدخول غير صحيحة' });
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid)
      throw new UnauthorizedException({ en: 'Invalid credentials', ar: 'بيانات الدخول غير صحيحة' });
    await this.usersRepository.update(user.id, user.version, { lastLoginAt: new Date() });
    return this.issueTokens(user.id, dto.branchId);
  }

  async refresh(token: string) {
    const record = await this.refreshTokensRepo.findValid(token);
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException({
        en: 'Invalid or expired refresh token',
        ar: 'رمز التحديث غير صالح أو منتهي الصلاحية',
      });
    }
    await this.refreshTokensRepo.revoke(token);
    return this.issueTokens(record.userId);
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokensRepo.revokeAllForUser(userId);
  }

  private async issueTokens(userId: string, branchId?: string) {
    const payload = { sub: userId, branchId: branchId ?? null };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.refreshTokensRepo.create({ userId, token: refreshToken, expiresAt });
    return { accessToken, refreshToken };
  }
}
