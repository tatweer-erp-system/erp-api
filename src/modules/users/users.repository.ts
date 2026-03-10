import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../database/base.repository';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.exists({ email });
  }

  async existsByPhone(phone: string): Promise<boolean> {
    return this.exists({ phone });
  }
}
