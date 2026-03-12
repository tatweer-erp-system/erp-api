import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { ApiKeysRepository } from '@/database/sql/repositories/api-keys.repository';
import { GenerateApiKeyDto } from '../dto/generate-api-key.dto';

@Injectable()
export class TenantApiKeysService {
  private readonly logger = new Logger(TenantApiKeysService.name);

  constructor(private readonly apiKeysRepository: ApiKeysRepository) {}

  /**
   * List all API keys for a tenant.
   * The key hash is never exposed; instead a masked placeholder is returned.
   */
  async listApiKeys(tenantId: string) {
    const keys = await this.apiKeysRepository.findAllRaw({
      tenantId,
      where: {},
      order: [['created_at', 'DESC']],
    });

    return keys.map((key: any) => ({
      id: key.id,
      name: key.name,
      key: this.maskKey(key.keyHash),
      scopes: key.scopes,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));
  }

  /**
   * Generate a new API key.
   * Returns the raw key only once — it is never stored or retrievable again.
   */
  async generateApiKey(tenantId: string, tenantSlug: string, dto: GenerateApiKeyDto) {
    // Check for duplicate name within the tenant
    const existing = await this.apiKeysRepository.findOne({
      tenantId,
      where: { name: dto.name, is_active: true },
    });
    if (existing) {
      throw new ConflictException(`An active API key with the name "${dto.name}" already exists`);
    }

    const rawKey = this.generateRawKey();
    const keyHash = this.hashKey(rawKey);

    const created = await this.apiKeysRepository.create(
      {
        tenantSlug,
        name: dto.name,
        keyHash,
        scopes: [],
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
      } as any,
      { tenantId },
    );

    this.logger.log(`Generated API key "${dto.name}" for tenant ${tenantId}`);

    return {
      id: (created as any).id,
      name: dto.name,
      key: rawKey,
      scopes: [],
      isActive: true,
      lastUsedAt: null,
      expiresAt: null,
      createdAt: (created as any).createdAt,
    };
  }

  /**
   * Revoke (soft-deactivate) an API key.
   */
  async revokeApiKey(tenantId: string, keyId: string) {
    const key = await this.apiKeysRepository.findByIdOrNull(keyId, { tenantId });
    if (!key) {
      throw new NotFoundException(`API key not found`);
    }

    await this.apiKeysRepository.update(keyId, { isActive: false } as any, { tenantId });

    this.logger.log(`Revoked API key ${keyId} for tenant ${tenantId}`);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Generate a cryptographically random API key prefixed with `tvr_`.
   */
  private generateRawKey(): string {
    const bytes = randomBytes(32);
    return `tvr_${bytes.toString('hex')}`;
  }

  /**
   * SHA-256 hash a raw key for storage.
   */
  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Produce a masked representation like `tvr_ab••••••ef`.
   */
  private maskKey(hash: string): string {
    // We only have the hash, so we show a truncated version of the hash
    return `••••••${hash.slice(-8)}`;
  }
}
