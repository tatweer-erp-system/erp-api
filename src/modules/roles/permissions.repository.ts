import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../database/base.repository';
import { Permission } from '../../database/entities/permission.entity';

@Injectable()
export class PermissionsRepository extends BaseRepository<Permission> {
  constructor() {
    super(Permission);
  }
}
