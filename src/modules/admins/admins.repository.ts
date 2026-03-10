import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../database/base.repository';
import { Admin } from '../../database/entities/admin.entity';

@Injectable()
export class AdminsRepository extends BaseRepository<Admin> {
  constructor() {
    super(Admin);
  }

  async findByEmail(email: string): Promise<Admin | null> {
    return this.findOne({
      where: { email },
    });
  }
}
