import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { ApiKey } from '../entities/api-key.entity';

@Injectable()
export class ApiKeysRepository extends BaseRepository<ApiKey> {
  constructor() {
    super(ApiKey, true);
  }
}
