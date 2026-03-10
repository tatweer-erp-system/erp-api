import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../database/base.repository';
import { Tenant } from '../../database/entities/tenant.entity';
import { TenantStatus } from '../../common/enums/status.enum';

@Injectable()
export class TenantsRepository extends BaseRepository<Tenant> {
  constructor() {
    super(Tenant);
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.findOne({ where: { slug } });
  }

  async existsBySlug(slug: string): Promise<boolean> {
    return this.exists({ slug });
  }

  async findByStatus(status: TenantStatus): Promise<Tenant[]> {
    return this.findAllRaw({ where: { status } });
  }
}
