import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Admin } from '../entities/admin.entity';

@Injectable()
export class AdminsRepository extends BaseRepository<Admin> {
  constructor() {
    super(Admin, false);
  }

  async findByEmail(email: string): Promise<Admin | null> {
    return this.findOne({
      where: { email },
    });
  }
}
