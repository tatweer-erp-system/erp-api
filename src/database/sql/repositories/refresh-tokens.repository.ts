import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '@/database/sql/entities/refresh-token.entity';

@Injectable()
export class RefreshTokensRepository {
  constructor(@InjectRepository(RefreshToken) private readonly repo: Repository<RefreshToken>) {}

  async create(data: Partial<RefreshToken>, ..._opts: any[]): Promise<RefreshToken> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async findValid(token: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { token, isRevoked: false } as any });
  }

  async revoke(token: string): Promise<void> {
    await this.repo.update({ token } as any, { isRevoked: true });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update({ userId } as any, { isRevoked: true });
  }
}
