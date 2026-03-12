import { Injectable, Logger } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { InjectConnection } from '@nestjs/sequelize';

@Injectable()
export class TenantSequelizeService {
  private readonly logger = new Logger(TenantSequelizeService.name);

  constructor(@InjectConnection() private readonly sharedSequelize: Sequelize) {}

  getSharedSequelize(): Sequelize {
    return this.sharedSequelize;
  }
}
