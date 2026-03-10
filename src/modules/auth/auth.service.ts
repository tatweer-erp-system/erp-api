import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { TenantSequelizeService } from '../../database/tenant-sequelize.service';
import { TokenCacheService } from './token-cache.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../common/types/request.types';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly tokenCacheService: TokenCacheService,
  ) {}

  async login(tenantSlug: string, dto: LoginDto): Promise<TokenPair> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [users] = await sequelize.query<{
      id: string;
      email: string;
      password_hash: string;
      first_name: string;
      last_name: string;
      is_active: boolean;
    }>(
      `SELECT id, email, password_hash, first_name, last_name, is_active
       FROM users WHERE email = :email AND deleted_at IS NULL LIMIT 1`,
      { replacements: { email: dto.email }, type: 'SELECT' } as any,
    );

    const user = (users as any[])[0];
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_active) throw new UnauthorizedException('Account is disabled');

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    const roles = await this.getUserRoles(sequelize, user.id);

    await sequelize.query(`UPDATE users SET last_login_at = NOW() WHERE id = :id`, {
      replacements: { id: user.id },
    } as any);

    return this.generateTokenPair(
      {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles,
      },
      tenantSlug,
    );
  }

  async refreshTokens(
    userId: string,
    tenantSlug: string,
    _refreshToken: string,
  ): Promise<TokenPair> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [users] = await sequelize.query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      is_active: boolean;
    }>(
      `SELECT id, email, first_name, last_name, is_active FROM users
       WHERE id = :id AND deleted_at IS NULL LIMIT 1`,
      { replacements: { id: userId }, type: 'SELECT' } as any,
    );

    const user = (users as any[])[0];
    if (!user || !user.is_active) throw new UnauthorizedException();

    const roles = await this.getUserRoles(sequelize, user.id);
    return this.generateTokenPair(
      {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles,
      },
      tenantSlug,
    );
  }

  async logout(userId: string): Promise<void> {
    await this.tokenCacheService.revokeAllUserTokens(userId);
  }

  private async generateTokenPair(
    user: { id: string; email: string; firstName: string; lastName: string; roles: string[] },
    tenantSlug: string,
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantSlug,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    await this.tokenCacheService.storeRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      },
    };
  }

  private async getUserRoles(sequelize: any, userId: string): Promise<string[]> {
    const [rows] = await sequelize.query<{ name: string }>(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = :userId AND r.deleted_at IS NULL`,
      { replacements: { userId }, type: 'SELECT' } as any,
    );
    return (rows as any[]).map((r) => r.name);
  }
}
