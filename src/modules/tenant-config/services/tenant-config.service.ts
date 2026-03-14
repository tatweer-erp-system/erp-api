import { Injectable } from '@nestjs/common';
import { UnifiedSettingsService } from '@/modules/settings/services/unified-settings.service';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { UpdateGeneralConfigDto } from '../dto/update-general-config.dto';
import { UpdateAccountingConfigDto } from '../dto/update-accounting-config.dto';
import { UpdateHrConfigDto } from '../dto/update-hr-config.dto';
import { UpdatePosConfigDto } from '../dto/update-pos-config.dto';
import { UpdateZatcaConfigDto } from '../dto/update-zatca-config.dto';

// ─── Key Maps ────────────────────────────────────────────────────────────────

const GENERAL_KEY_MAP: Record<string, string> = {
  timezone: 'timezone',
  language: 'language',
  dateFormat: 'dateFormat',
};

const ACCOUNTING_KEY_MAP: Record<string, string> = {
  fiscalYearStartMonth: 'fiscalYearStartMonth',
  vatRate: 'vatRate',
  salaryCalculationBasis: 'salaryCalculationBasis',
};

const HR_KEY_MAP: Record<string, string> = {
  contractExpiryWarningDays: 'contractExpiryWarningDays',
  maxAdvanceDeductionPct: 'maxAdvanceDeductionPct',
};

const POS_KEY_MAP: Record<string, string> = {
  allowNegativeStock: 'allowNegativeStock',
  defaultTaxRate: 'posDefaultTaxRate',
  loyaltyEnabled: 'loyaltyEnabled',
  maxHeldOrders: 'maxHeldOrders',
};

const ZATCA_KEY_MAP: Record<string, string> = {
  zatcaEnvironment: 'zatcaEnvironment',
  vatNumber: 'zatcaVatNumber',
  crNumber: 'zatcaCrNumber',
  sellerNameEn: 'zatcaSellerNameEn',
  sellerNameAr: 'zatcaSellerNameAr',
  city: 'zatcaSellerCity',
  district: 'zatcaSellerDistrict',
  street: 'zatcaSellerStreet',
  buildingNo: 'zatcaSellerBuildingNo',
  postalCode: 'zatcaSellerPostalCode',
  csid: 'zatcaCsid',
  privateKey: 'zatcaPrivateKey',
  certificate: 'zatcaCertificate',
};

const ZATCA_SENSITIVE_KEYS = ['zatcaCsid', 'zatcaPrivateKey', 'zatcaCertificate'];

@Injectable()
export class TenantConfigService {
  constructor(
    private readonly settings: UnifiedSettingsService,
    private readonly tenantSettingsRepo: TenantSettingsRepository,
  ) {}

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private async readGroup(
    tenantId: string,
    keyMap: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const keys = Object.values(keyMap);
    const values = await this.settings.getMany(tenantId, keys);
    const result: Record<string, unknown> = {};
    for (const [field, settingKey] of Object.entries(keyMap)) {
      result[field] = values[settingKey] ?? null;
    }
    return result;
  }

  private async writeGroup(
    tenantId: string,
    dto: Record<string, unknown>,
    keyMap: Record<string, string>,
    group: string,
  ): Promise<void> {
    for (const [field, value] of Object.entries(dto)) {
      if (value === undefined || value === null) continue;
      const settingKey = keyMap[field];
      if (!settingKey) continue;
      await this.tenantSettingsRepo.upsertSetting(tenantId, {
        key: settingKey,
        value: String(value),
        group,
      });
      this.settings.invalidate(tenantId, settingKey);
    }
  }

  // ─── Read Methods ────────────────────────────────────────────────────────

  async getGeneral(tenantId: string): Promise<Record<string, unknown>> {
    return this.readGroup(tenantId, GENERAL_KEY_MAP);
  }

  async getAccounting(tenantId: string): Promise<Record<string, unknown>> {
    return this.readGroup(tenantId, ACCOUNTING_KEY_MAP);
  }

  async getHr(tenantId: string): Promise<Record<string, unknown>> {
    return this.readGroup(tenantId, HR_KEY_MAP);
  }

  async getPos(tenantId: string): Promise<Record<string, unknown>> {
    return this.readGroup(tenantId, POS_KEY_MAP);
  }

  async getZatca(tenantId: string): Promise<Record<string, unknown>> {
    const raw = await this.readGroup(tenantId, ZATCA_KEY_MAP);
    // Replace sensitive values with a configured flag
    for (const field of Object.keys(ZATCA_KEY_MAP)) {
      if (ZATCA_SENSITIVE_KEYS.includes(ZATCA_KEY_MAP[field])) {
        const configuredKey = field + 'Configured';
        raw[configuredKey] = raw[field] !== null && raw[field] !== '';
        delete raw[field];
      }
    }
    return raw;
  }

  async getAll(tenantId: string): Promise<Record<string, Record<string, unknown>>> {
    const [general, accounting, hr, pos, zatca] = await Promise.all([
      this.getGeneral(tenantId),
      this.getAccounting(tenantId),
      this.getHr(tenantId),
      this.getPos(tenantId),
      this.getZatca(tenantId),
    ]);
    return { general, accounting, hr, pos, zatca };
  }

  // ─── Write Methods ───────────────────────────────────────────────────────

  async updateGeneral(tenantId: string, dto: UpdateGeneralConfigDto): Promise<void> {
    return this.writeGroup(
      tenantId,
      dto as unknown as Record<string, unknown>,
      GENERAL_KEY_MAP,
      'general',
    );
  }

  async updateAccounting(tenantId: string, dto: UpdateAccountingConfigDto): Promise<void> {
    return this.writeGroup(
      tenantId,
      dto as unknown as Record<string, unknown>,
      ACCOUNTING_KEY_MAP,
      'accounting',
    );
  }

  async updateHr(tenantId: string, dto: UpdateHrConfigDto): Promise<void> {
    return this.writeGroup(tenantId, dto as unknown as Record<string, unknown>, HR_KEY_MAP, 'hr');
  }

  async updatePos(tenantId: string, dto: UpdatePosConfigDto): Promise<void> {
    return this.writeGroup(tenantId, dto as unknown as Record<string, unknown>, POS_KEY_MAP, 'pos');
  }

  async updateZatca(tenantId: string, dto: UpdateZatcaConfigDto): Promise<void> {
    return this.writeGroup(
      tenantId,
      dto as unknown as Record<string, unknown>,
      ZATCA_KEY_MAP,
      'zatca',
    );
  }
}
