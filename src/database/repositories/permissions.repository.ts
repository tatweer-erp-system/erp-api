import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class PermissionsRepository extends BaseRepository<Permission> {
  constructor() {
    super(Permission);
  }
}
