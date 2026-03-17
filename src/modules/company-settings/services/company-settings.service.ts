import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CompanySettingsRepository } from '@/database/sql/repositories/company-settings.repository';
import { BranchSettingsRepository } from '@/database/sql/repositories/branch-settings.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { UpdateCompanySettingsDto } from '../dto/update-company-settings.dto';
import { UpdateBranchSettingsDto } from '../dto/update-branch-settings.dto';

@Injectable()
export class CompanySettingsService {
  private readonly logger = new Logger(CompanySettingsService.name);

  constructor(
    private readonly companySettingsRepository: CompanySettingsRepository,
    private readonly branchSettingsRepository: BranchSettingsRepository,
  ) {}

  // ─── Company Settings ──────────────────────────────────────────────────

  async getCompanySettings(tenantId: string) {
    const settings = await this.companySettingsRepository.findOne({
      tenantId,
      where: { tenantId },
    });

    if (!settings) {
      // Return defaults if no record exists yet
      return this.companySettingsRepository.create({ tenantId } as any, {
        tenantId,
        bypassTenantScope: true,
      });
    }

    return settings;
  }

  async updateCompanySettings(
    tenantId: string,
    dto: UpdateCompanySettingsDto,
    auditContext: AuditContext,
  ) {
    const settings = await this.companySettingsRepository.findOne({
      tenantId,
      where: { tenantId },
    });

    if (!settings) {
      // Create with defaults + overrides
      return this.companySettingsRepository.create({ tenantId, ...dto } as any, {
        tenantId,
        auditContext,
        bypassTenantScope: true,
      });
    }

    const settingsRecord = settings as unknown as Record<string, unknown>;
    const id = settingsRecord.id as string;

    const updateData: Record<string, unknown> = {};
    if (dto.defaultARAccountId !== undefined)
      updateData.defaultARAccountId = dto.defaultARAccountId;
    if (dto.defaultAPAccountId !== undefined)
      updateData.defaultAPAccountId = dto.defaultAPAccountId;
    if (dto.defaultCOGSAccountId !== undefined)
      updateData.defaultCOGSAccountId = dto.defaultCOGSAccountId;
    if (dto.defaultInventoryAccountId !== undefined)
      updateData.defaultInventoryAccountId = dto.defaultInventoryAccountId;
    if (dto.taxExigibility !== undefined) updateData.taxExigibility = dto.taxExigibility;
    if (dto.fiscalLockDate !== undefined) updateData.fiscalLockDate = dto.fiscalLockDate;
    if (dto.taxLockDate !== undefined) updateData.taxLockDate = dto.taxLockDate;
    if (dto.angloSaxonAccounting !== undefined)
      updateData.angloSaxonAccounting = dto.angloSaxonAccounting;
    if (dto.stockCostingMethod !== undefined)
      updateData.stockCostingMethod = dto.stockCostingMethod;
    if (dto.negativeStockBlock !== undefined)
      updateData.negativeStockBlock = dto.negativeStockBlock;
    if (dto.autoReorder !== undefined) updateData.autoReorder = dto.autoReorder;
    if (dto.invoicePolicy !== undefined) updateData.invoicePolicy = dto.invoicePolicy;
    if (dto.creditLimitBlock !== undefined) updateData.creditLimitBlock = dto.creditLimitBlock;
    if (dto.creditLimitWarning !== undefined)
      updateData.creditLimitWarning = dto.creditLimitWarning;
    if (dto.threeWayMatch !== undefined) updateData.threeWayMatch = dto.threeWayMatch;
    if (dto.threeWayMatchTolerance !== undefined)
      updateData.threeWayMatchTolerance = dto.threeWayMatchTolerance;
    if (dto.billControl !== undefined) updateData.billControl = dto.billControl;
    if (dto.workDaysPerMonth !== undefined) updateData.workDaysPerMonth = dto.workDaysPerMonth;
    if (dto.workHoursPerDay !== undefined) updateData.workHoursPerDay = dto.workHoursPerDay;
    if (dto.overtimeRate !== undefined) updateData.overtimeRate = dto.overtimeRate;
    if (dto.lateDeductionEnabled !== undefined)
      updateData.lateDeductionEnabled = dto.lateDeductionEnabled;
    if (dto.lateToleranceMinutes !== undefined)
      updateData.lateToleranceMinutes = dto.lateToleranceMinutes;
    if (dto.gosiEmployeePct !== undefined) updateData.gosiEmployeePct = dto.gosiEmployeePct;
    if (dto.gosiEmployerPct !== undefined) updateData.gosiEmployerPct = dto.gosiEmployerPct;
    if (dto.incomeTaxMethod !== undefined) updateData.incomeTaxMethod = dto.incomeTaxMethod;
    if (dto.eoscEnabled !== undefined) updateData.eoscEnabled = dto.eoscEnabled;
    if (dto.eoscBase !== undefined) updateData.eoscBase = dto.eoscBase;
    if (dto.negativeLeaveAllowed !== undefined)
      updateData.negativeLeaveAllowed = dto.negativeLeaveAllowed;

    return this.companySettingsRepository.update(id, updateData as any, {
      tenantId,
      auditContext,
    });
  }

  // ─── Branch Settings ───────────────────────────────────────────────────

  async getBranchSettings(tenantId: string, branchId: string) {
    const settings = await this.branchSettingsRepository.findAllRaw({
      tenantId,
      where: { branchId },
    });

    // Convert array of key-value records to a flat object
    const result: Record<string, string | null> = {};
    for (const setting of settings) {
      const s = setting as unknown as Record<string, unknown>;
      result[s.key as string] = (s.value as string) ?? null;
    }

    return result;
  }

  async updateBranchSettings(
    tenantId: string,
    branchId: string,
    dto: UpdateBranchSettingsDto,
    auditContext: AuditContext,
  ) {
    const transaction = await this.branchSettingsRepository.createTransaction();

    try {
      for (const item of dto.settings) {
        const existing = await this.branchSettingsRepository.findOne({
          tenantId,
          where: { branchId, key: item.key },
          transaction,
        });

        if (existing) {
          const existingRecord = existing as unknown as Record<string, unknown>;
          await this.branchSettingsRepository.update(
            existingRecord.id as string,
            { value: item.value } as any,
            { tenantId, transaction, auditContext },
          );
        } else {
          await this.branchSettingsRepository.create(
            {
              branchId,
              key: item.key,
              value: item.value,
            } as any,
            { tenantId, transaction, auditContext },
          );
        }
      }

      await transaction.commit();
      return this.getBranchSettings(tenantId, branchId);
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
}
