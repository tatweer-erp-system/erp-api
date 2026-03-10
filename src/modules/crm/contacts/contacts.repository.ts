import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { Contact } from '../../../database/entities/contact.entity';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { QueryOptions } from '../../../common/interfaces/repository.interface';

@Injectable()
export class ContactsRepository extends BaseRepository<Contact> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Contact);
  }

  async getModel(tenantSlug: string): Promise<typeof Contact> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    if (!sequelize.isDefined('Contact')) {
      sequelize.addModels([Contact]);
    }
    return Contact;
  }

  async findByEmail(
    tenantSlug: string,
    email: string,
    options: QueryOptions = {},
  ): Promise<Contact | null> {
    await this.getModel(tenantSlug);
    return this.findOne({
      where: { email, ...options.where },
      transaction: options.transaction,
    });
  }

  async existsByEmail(tenantSlug: string, email: string, excludeId?: string): Promise<boolean> {
    await this.getModel(tenantSlug);
    const where: Record<string, unknown> = { email };
    if (excludeId) {
      const { Op } = await import('sequelize');
      where.id = { [Op.ne]: excludeId };
    }
    return this.exists(where);
  }
}
