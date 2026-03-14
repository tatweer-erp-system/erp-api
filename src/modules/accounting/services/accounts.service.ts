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
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { SAUDI_COA_SEED } from '@/database/sql/seeders/saudi-coa.seed';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    private readonly coaRepository: ChartOfAccountsRepository,
    private readonly tenantSettingsRepository: TenantSettingsRepository,
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

  async seedSaudiCoa(tenantId: string, auditContext: AuditContext) {
    const seeded = await this.tenantSettingsRepository.findByKeyTenant(tenantId, 'coaSeeded');
    if (seeded?.value === 'true') {
      return { message: 'COA already seeded', skipped: true };
    }

    const isOwner = true;
    const transaction = await this.coaRepository.createTransaction();

    try {
      const codeToId: Record<string, string> = {};
      let created = 0;

      for (const entry of SAUDI_COA_SEED) {
        const exists = await this.coaRepository.findByCode(tenantId, entry.code, transaction);
        if (exists) {
          codeToId[entry.code] = (exists as unknown as Record<string, unknown>).id as string;
          continue;
        }

        const parentId = entry.parentCode ? (codeToId[entry.parentCode] ?? null) : null;

        const record = await this.coaRepository.create(
          {
            code: entry.code,
            nameEn: entry.nameEn,
            nameAr: entry.nameAr,
            type: entry.type,
            normalBalance: entry.normalBalance,
            allowDirectPosting: entry.allowDirectPosting,
            parentId,
            isActive: true,
            currency: 'SAR',
          } as any,
          { tenantId, auditContext, transaction },
        );

        codeToId[entry.code] = (record as unknown as Record<string, unknown>).id as string;
        created++;
      }

      await this.tenantSettingsRepository.upsertSetting(tenantId, {
        key: 'coaSeeded',
        value: 'true',
        group: 'accounting',
        type: 'boolean',
      });

      if (isOwner) await transaction.commit();
      this.logger.log(`Saudi COA seeded for tenant ${tenantId}: ${created} accounts created`);
      return { message: 'Saudi COA seeded successfully', created };
    } catch (e) {
      if (isOwner) await transaction.rollback();
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
