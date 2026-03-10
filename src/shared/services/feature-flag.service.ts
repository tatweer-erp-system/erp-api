import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/tenant-sequelize.service';
import { CacheService, CACHE_TTL } from '@/infrastructure/cache/cache.service';

export interface TenantFeatures {
  hr: boolean;
  inventory: boolean;
  crm: boolean;
  purchasing: boolean;
  projects: boolean;
  chat: boolean;
  reporting: boolean;
  [key: string]: boolean;
}

const DEFAULT_FEATURES: TenantFeatures = {
  hr: true,
  inventory: true,
  crm: true,
  purchasing: true,
  projects: true,
  chat: false,
  reporting: true,
};

@Injectable()
export class FeatureFlagSharedService {
  private readonly logger = new Logger(FeatureFlagSharedService.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly cacheService: CacheService,
  ) {}

  async getFeatures(tenantSlug: string): Promise<TenantFeatures> {
    const cacheKey = `features:${tenantSlug}`;
    const cached = await this.cacheService.get<TenantFeatures>(cacheKey);
    if (cached) return cached;

    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [results] = await sequelize.query(
      `SELECT features FROM tenants WHERE slug = :slug AND deleted_at IS NULL`,
      { replacements: { slug: tenantSlug } },
    );

    const tenant = (results as any[])[0];
    const features: TenantFeatures = {
      ...DEFAULT_FEATURES,
      ...(tenant?.features ?? {}),
    };

    await this.cacheService.set(cacheKey, features, CACHE_TTL.dropdown);
    return features;
  }

  async isEnabled(tenantSlug: string, feature: string): Promise<boolean> {
    const features = await this.getFeatures(tenantSlug);
    return features[feature] ?? false;
  }

  async requireFeature(tenantSlug: string, feature: string): Promise<void> {
    const enabled = await this.isEnabled(tenantSlug, feature);
    if (!enabled) {
      throw new ForbiddenException(`Feature '${feature}' is not enabled for this tenant`);
    }
  }

  async invalidateCache(tenantSlug: string): Promise<void> {
    await this.cacheService.del(`features:${tenantSlug}`);
  }
}
