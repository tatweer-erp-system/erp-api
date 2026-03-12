import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../base.repository';
import { ApiKey } from '../entities/api-key.entity';

@Injectable()
export class ApiKeysRepository extends TenantAwareRepository<ApiKey> {
  constructor() {
    super(ApiKey);
  }
}
