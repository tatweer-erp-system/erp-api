import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { UserPreference } from '../entities/user-preference.entity';

@Injectable()
export class UserPreferencesRepository extends BaseRepository<UserPreference> {
  constructor() {
    super(UserPreference, false); // NOT tenant-scoped - keyed by userId
  }

  async findByUserAndKey(userId: string, key: string): Promise<UserPreference | null> {
    return this.findOne({
      where: { userId, key },
    });
  }

  async upsertPreference(
    userId: string,
    key: string,
    value: string | null,
  ): Promise<UserPreference> {
    const existing = await this.findByUserAndKey(userId, key);
    if (existing) {
      return existing.update({ value });
    }
    return this.create({ userId, key, value } as any, {});
  }

  async findAllByUser(userId: string): Promise<UserPreference[]> {
    const result = await this.findAll({
      where: { userId } as any,
      limit: 100,
      page: 1,
    });
    return result.data;
  }
}
