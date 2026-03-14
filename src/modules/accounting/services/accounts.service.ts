import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Transaction } from 'sequelize';
import { ChartOfAccountsRepository } from '@/database/sql/repositories/chart-of-accounts.repository';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { UnifiedSettingsService } from '@/modules/settings/services/unified-settings.service';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { SAUDI_COA_DEFAULTS, COA_SETTING_KEY_MAP } from '@/common/defaults/saudi-coa.defaults';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    private readonly coaRepository: ChartOfAccountsRepository,
    private readonly tenantSettingsRepository: TenantSettingsRepository,
    private readonly unifiedSettings: UnifiedSettingsService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.coaRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['code'],
      sortBy: 'code',
      sortOrder: query.sortOrder ?? 'ASC',
    });
  }

  async findById(tenantId: string, id: string) {
    const account = await this.coaRepository.findByIdOrNull(id, { tenantId });
    if (!account) throw new NotFoundException(msg(ErrorMessages.ACCOUNT_NOT_FOUND, id));
    return account;
  }

  async getTree(tenantId: string) {
    const flat = await this.coaRepository.getTree(tenantId);
    return this.buildTree(flat);
  }

  async create(tenantId: string, dto: CreateAccountDto, auditContext: AuditContext) {
    const existing = await this.coaRepository.existsByCode(tenantId, dto.code);
    if (existing) {
      throw new ConflictException(msg(ErrorMessages.ACCOUNT_CODE_DUPLICATE, dto.code));
    }

    return this.coaRepository.create(
      {
        code: dto.code,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        descriptionEn: dto.descriptionEn ?? null,
        descriptionAr: dto.descriptionAr ?? null,
        type: dto.type,
        subType: dto.subType ?? null,
        parentId: dto.parentId ?? null,
        normalBalance: dto.normalBalance,
        isActive: dto.isActive ?? true,
        allowDirectPosting: dto.allowDirectPosting ?? true,
        openingBalance: dto.openingBalance ?? null,
        openingBalanceDate: dto.openingBalanceDate ?? null,
        currency: dto.currency ?? 'SAR',
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(tenantId: string, id: string, dto: UpdateAccountDto, auditContext: AuditContext) {
    const account = await this.coaRepository.findByIdOrNull(id, { tenantId });
    if (!account) throw new NotFoundException(msg(ErrorMessages.ACCOUNT_NOT_FOUND, id));

    const accountRecord = account as unknown as Record<string, unknown>;

    // If deactivating, check for unposted entries
    if (dto.isActive === false && accountRecord.isActive === true) {
      const hasUnposted = await this.coaRepository.hasUnpostedLines(tenantId, id);
      if (hasUnposted) {
        throw new BadRequestException(
          msg(ErrorMessages.ACCOUNT_REFERENCED_BY_ENTRIES, accountRecord.code as string),
        );
      }
    }

    // If code is changing, check uniqueness
    if (dto.code && dto.code !== accountRecord.code) {
      const existing = await this.coaRepository.existsByCode(tenantId, dto.code);
      if (existing) {
        throw new ConflictException(msg(ErrorMessages.ACCOUNT_CODE_DUPLICATE, dto.code));
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) updateData.nameAr = dto.nameAr;
    if (dto.descriptionEn !== undefined) updateData.descriptionEn = dto.descriptionEn;
    if (dto.descriptionAr !== undefined) updateData.descriptionAr = dto.descriptionAr;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.subType !== undefined) updateData.subType = dto.subType;
    if (dto.parentId !== undefined) updateData.parentId = dto.parentId;
    if (dto.normalBalance !== undefined) updateData.normalBalance = dto.normalBalance;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.allowDirectPosting !== undefined)
      updateData.allowDirectPosting = dto.allowDirectPosting;
    if (dto.openingBalance !== undefined) updateData.openingBalance = dto.openingBalance;
    if (dto.openingBalanceDate !== undefined)
      updateData.openingBalanceDate = dto.openingBalanceDate;

    return this.coaRepository.update(id, updateData as any, { tenantId, auditContext });
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const account = await this.coaRepository.findByIdOrNull(id, { tenantId });
    if (!account) throw new NotFoundException(msg(ErrorMessages.ACCOUNT_NOT_FOUND, id));

    const accountRecord = account as unknown as Record<string, unknown>;

    const hasPosted = await this.coaRepository.hasPostedLines(tenantId, id);
    if (hasPosted) {
      throw new ConflictException(
        msg(ErrorMessages.ACCOUNT_HAS_POSTED_LINES, accountRecord.code as string),
      );
    }

    await this.coaRepository.softDelete(id, { tenantId, auditContext });
  }

  /**
   * Repair missing COA accounts and settings. Fully idempotent — never overwrites existing data.
   * Useful for recovering from provisioning failures.
   */
  async repairCoa(tenantId: string, auditContext: AuditContext) {
    const transaction = await this.coaRepository.createTransaction();

    try {
      const codeToId: Record<string, string> = {};
      let accountsCreated = 0;
      let settingsUpdated = 0;
      let skipped = 0;

      // Insert missing COA accounts
      for (const entry of SAUDI_COA_DEFAULTS) {
        const exists = await this.coaRepository.findByCode(tenantId, entry.code, transaction);
        if (exists) {
          codeToId[entry.code] = (exists as unknown as Record<string, unknown>).id as string;
          skipped++;
          continue;
        }

        const record = await this.coaRepository.create(
          {
            code: entry.code,
            nameEn: entry.nameEn,
            nameAr: entry.nameAr,
            type: entry.accountType,
            normalBalance: entry.normalBalance,
            allowDirectPosting: entry.allowDirectPosting,
            isActive: entry.isActive,
            currency: 'SAR',
          } as any,
          { tenantId, auditContext, transaction },
        );

        codeToId[entry.code] = (record as unknown as Record<string, unknown>).id as string;
        accountsCreated++;
      }

      // Upsert missing COA account ID settings
      for (const [key, code] of Object.entries(COA_SETTING_KEY_MAP)) {
        const existingValue = await this.unifiedSettings.get(tenantId, key);
        if (existingValue) continue;

        const accountId = codeToId[code];
        if (accountId) {
          await this.tenantSettingsRepository.upsertSetting(tenantId, {
            key,
            value: accountId,
            group: 'accounting',
            type: 'string',
          });
          this.unifiedSettings.invalidate(tenantId, key);
          settingsUpdated++;
        }
      }

      // Mark COA as seeded
      await this.tenantSettingsRepository.upsertSetting(tenantId, {
        key: 'coaSeeded',
        value: 'true',
        group: 'accounting',
        type: 'boolean',
      });
      this.unifiedSettings.invalidate(tenantId, 'coaSeeded');

      await transaction.commit();
      this.logger.log(
        `COA repair for tenant ${tenantId}: ${accountsCreated} created, ${settingsUpdated} settings updated, ${skipped} skipped`,
      );
      return { accountsCreated, settingsUpdated, skipped };
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  private buildTree(
    flat: Record<string, unknown>[],
    parentId: string | null = null,
  ): Record<string, unknown>[] {
    return flat
      .filter((node) => (node.parentId ?? null) === parentId)
      .map((node) => ({
        ...node,
        children: this.buildTree(flat, node.id as string),
      }));
  }
}
