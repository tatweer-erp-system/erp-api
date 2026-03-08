import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '../../database/tenant-sequelize.service';
import { AuditLog } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
  tenantSlug: string;
  userId?: string;
  action: string;
  module: string;
  recordId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async log(data: CreateAuditLogDto): Promise<void> {
    try {
      const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(data.tenantSlug);
      sequelize.addModels([AuditLog]);
      await AuditLog.create({
        tenantSlug: data.tenantSlug,
        userId: data.userId ?? null,
        action: data.action,
        module: data.module,
        recordId: data.recordId ?? null,
        before: data.before ?? null,
        after: data.after ?? null,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
      });
    } catch (err) {
      this.logger.error('Failed to write audit log', err);
    }
  }

  async findByTenant(
    tenantSlug: string,
    page = 1,
    limit = 20,
  ): Promise<{ rows: AuditLog[]; count: number }> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    sequelize.addModels([AuditLog]);
    return AuditLog.findAndCountAll({
      where: { tenantSlug },
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });
  }
}
