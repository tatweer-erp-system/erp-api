import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class AuthRepository extends BaseRepository<RefreshToken> {
  constructor() {
    super(RefreshToken);
  }

  async createToken(data: {
    userId: string;
    tenantSlug: string;
    tokenHash: string;
    family: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<RefreshToken> {
    return RefreshToken.create({
      userId: data.userId,
      tenantSlug: data.tenantSlug,
      tokenHash: data.tokenHash,
      family: data.family,
      expiresAt: data.expiresAt,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      revoked: false,
    } as any);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return RefreshToken.findOne({
      where: { tokenHash, revoked: false },
    });
  }

  async findActiveByFamily(family: string): Promise<RefreshToken[]> {
    return RefreshToken.findAll({
      where: {
        family,
        revoked: false,
        expiresAt: { [Op.gt]: new Date() },
      },
    });
  }

  async findActiveTokensForUser(userId: string): Promise<RefreshToken[]> {
    return RefreshToken.findAll({
      where: {
        userId,
        revoked: false,
        expiresAt: { [Op.gt]: new Date() },
      },
    });
  }

  async revokeToken(id: string): Promise<void> {
    await RefreshToken.update({ revoked: true, revokedAt: new Date() } as any, { where: { id } });
  }

  async revokeFamily(family: string): Promise<void> {
    await RefreshToken.update({ revoked: true, revokedAt: new Date() } as any, {
      where: { family, revoked: false },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshToken.update({ revoked: true, revokedAt: new Date() } as any, {
      where: { userId, revoked: false },
    });
  }

  async getActiveSessions(userId: string): Promise<RefreshToken[]> {
    return RefreshToken.findAll({
      where: {
        userId,
        revoked: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'ipAddress', 'userAgent', 'createdAt', 'expiresAt'],
    });
  }
}
