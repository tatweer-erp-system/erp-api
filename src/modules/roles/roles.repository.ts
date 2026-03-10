import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../database/base.repository';
import { Role } from '../../database/entities/role.entity';

@Injectable()
export class RolesRepository extends BaseRepository<Role> {
  constructor() {
    super(Role);
  }

  async findByName(name: string): Promise<Role | null> {
    return this.findOne({ where: { name } });
  }

  async existsByName(name: string): Promise<boolean> {
    return this.exists({ name });
  }
}
