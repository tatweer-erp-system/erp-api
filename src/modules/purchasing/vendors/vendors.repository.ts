import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { BaseRepository } from '../../../database/base.repository';
import { Vendor } from '../../../database/entities/vendor.entity';

@Injectable()
export class VendorsRepository extends BaseRepository<Vendor> {
  constructor() {
    super(Vendor);
  }

  async findByEmail(email: string): Promise<Vendor | null> {
    return this.findOne({
      where: { email },
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const vendor = await this.findByEmail(email);
    return vendor !== null;
  }
}
