import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { FiscalPositionsRepository } from '@/database/sql/repositories/fiscal-positions.repository';
import { FiscalPositionTaxesRepository } from '@/database/sql/repositories/fiscal-position-taxes.repository';
import { FiscalPositionAccountsRepository } from '@/database/sql/repositories/fiscal-position-accounts.repository';
import { PartnersRepository } from '@/database/sql/repositories/partners.repository';
import { FiscalPositionTax } from '@/database/sql/entities/fiscal-position-tax.entity';
import { FiscalPositionAccount } from '@/database/sql/entities/fiscal-position-account.entity';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { CreateFiscalPositionDto } from '../dto/create-fiscal-position.dto';
import { UpdateFiscalPositionDto } from '../dto/update-fiscal-position.dto';
import { ResolveFiscalPositionDto } from '../dto/resolve-fiscal-position.dto';

@Injectable()
export class FiscalPositionsService {
  private readonly logger = new Logger(FiscalPositionsService.name);

  constructor(
    private readonly fiscalPositionsRepository: FiscalPositionsRepository,
    private readonly fiscalPositionTaxesRepository: FiscalPositionTaxesRepository,
    private readonly fiscalPositionAccountsRepository: FiscalPositionAccountsRepository,
    private readonly partnersRepository: PartnersRepository,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.fiscalPositionsRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['nameEn', 'nameAr'],
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'DESC',
    });
  }

  async findById(tenantId: string, id: string) {
    const position = await this.fiscalPositionsRepository.findByIdOrNull(id, { tenantId });
    if (!position) {
      throw new NotFoundException(msg(ErrorMessages.FISCAL_POSITION_NOT_FOUND, id));
    }

    const taxMappings = await this.fiscalPositionTaxesRepository.findAllRaw({
      tenantId,
      where: { fiscalPositionId: id },
    });

    const accountMappings = await this.fiscalPositionAccountsRepository.findAllRaw({
      tenantId,
      where: { fiscalPositionId: id },
    });

    return {
      ...(position as unknown as Record<string, unknown>),
      taxMappings,
      accountMappings,
    };
  }

  async create(tenantId: string, dto: CreateFiscalPositionDto, auditContext: AuditContext) {
    const transaction = await this.fiscalPositionsRepository.createTransaction();

    try {
      const position = await this.fiscalPositionsRepository.create(
        {
          nameEn: dto.nameEn,
          nameAr: dto.nameAr,
          autoDetect: dto.autoDetect ?? false,
          country: dto.country ?? null,
          note: dto.note ?? null,
          isActive: true,
        } as any,
        { tenantId, transaction, auditContext },
      );

      const positionRecord = position as unknown as Record<string, unknown>;
      const fiscalPositionId = positionRecord.id as string;

      if (dto.taxMappings && dto.taxMappings.length > 0) {
        await this.fiscalPositionTaxesRepository.bulkCreate({
          data: dto.taxMappings.map((m) => ({
            fiscalPositionId,
            taxSrcId: m.taxSrcId,
            taxDestId: m.taxDestId ?? null,
          })),
          tenantId,
          transaction,
          auditContext,
        });
      }

      if (dto.accountMappings && dto.accountMappings.length > 0) {
        await this.fiscalPositionAccountsRepository.bulkCreate({
          data: dto.accountMappings.map((m) => ({
            fiscalPositionId,
            accountSrcId: m.accountSrcId,
            accountDestId: m.accountDestId,
          })),
          tenantId,
          transaction,
          auditContext,
        });
      }

      await transaction.commit();
      return this.findById(tenantId, fiscalPositionId);
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateFiscalPositionDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.fiscalPositionsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.FISCAL_POSITION_NOT_FOUND, id));
    }

    const transaction = await this.fiscalPositionsRepository.createTransaction();

    try {
      const updateData: Record<string, unknown> = {};
      if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
      if (dto.nameAr !== undefined) updateData.nameAr = dto.nameAr;
      if (dto.autoDetect !== undefined) updateData.autoDetect = dto.autoDetect;
      if (dto.country !== undefined) updateData.country = dto.country;
      if (dto.note !== undefined) updateData.note = dto.note;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      await this.fiscalPositionsRepository.update(id, updateData as any, {
        tenantId,
        transaction,
        auditContext,
      });

      // Replace tax mappings if provided
      if (dto.taxMappings !== undefined) {
        // Delete existing
        const existingTaxMappings = await this.fiscalPositionTaxesRepository.findAllRaw({
          tenantId,
          where: { fiscalPositionId: id },
          transaction,
        });
        for (const mapping of existingTaxMappings) {
          const m = mapping as unknown as Record<string, unknown>;
          await this.fiscalPositionTaxesRepository.hardDelete(m.id as string, {
            tenantId,
            transaction,
          });
        }

        // Insert new
        if (dto.taxMappings.length > 0) {
          await this.fiscalPositionTaxesRepository.bulkCreate({
            data: dto.taxMappings.map((m) => ({
              fiscalPositionId: id,
              taxSrcId: m.taxSrcId,
              taxDestId: m.taxDestId ?? null,
            })),
            tenantId,
            transaction,
            auditContext,
          });
        }
      }

      // Replace account mappings if provided
      if (dto.accountMappings !== undefined) {
        const existingAccountMappings = await this.fiscalPositionAccountsRepository.findAllRaw({
          tenantId,
          where: { fiscalPositionId: id },
          transaction,
        });
        for (const mapping of existingAccountMappings) {
          const m = mapping as unknown as Record<string, unknown>;
          await this.fiscalPositionAccountsRepository.hardDelete(m.id as string, {
            tenantId,
            transaction,
          });
        }

        if (dto.accountMappings.length > 0) {
          await this.fiscalPositionAccountsRepository.bulkCreate({
            data: dto.accountMappings.map((m) => ({
              fiscalPositionId: id,
              accountSrcId: m.accountSrcId,
              accountDestId: m.accountDestId,
            })),
            tenantId,
            transaction,
            auditContext,
          });
        }
      }

      await transaction.commit();
      return this.findById(tenantId, id);
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.fiscalPositionsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.FISCAL_POSITION_NOT_FOUND, id));
    }
    await this.fiscalPositionsRepository.softDelete(id, { tenantId, auditContext });
  }

  /**
   * Resolves tax mappings for a partner's fiscal position.
   * For each tax in taxIds, checks if the fiscal position has a mapping.
   * If mapped, replaces with taxDestId (or removes if taxDestId is null).
   * If not mapped, keeps the original tax.
   */
  async resolve(tenantId: string, dto: ResolveFiscalPositionDto) {
    const partner = await this.partnersRepository.findOneById(tenantId, dto.partnerId);
    if (!partner) {
      throw new NotFoundException(msg(ErrorMessages.PARTNER_NOT_FOUND, dto.partnerId));
    }

    const fiscalPositionId = partner.fiscalPositionId;
    if (!fiscalPositionId) {
      // No fiscal position — return original taxes unchanged
      return { taxIds: dto.taxIds };
    }

    const taxMappings = await this.fiscalPositionTaxesRepository.findAllRaw({
      tenantId,
      where: { fiscalPositionId },
    });

    // Build a lookup: taxSrcId → taxDestId (null means remove)
    const mappingLookup = new Map<string, string | null>();
    for (const mapping of taxMappings) {
      const m = mapping as unknown as Record<string, unknown>;
      mappingLookup.set(m.taxSrcId as string, (m.taxDestId as string) ?? null);
    }

    const resolvedTaxIds: string[] = [];
    for (const taxId of dto.taxIds) {
      if (mappingLookup.has(taxId)) {
        const destId = mappingLookup.get(taxId);
        if (destId !== null) {
          resolvedTaxIds.push(destId!);
        }
        // If destId is null, the tax is removed (not added to result)
      } else {
        resolvedTaxIds.push(taxId);
      }
    }

    return { taxIds: resolvedTaxIds, fiscalPositionId };
  }

  /**
   * Resolves an account mapping for a fiscal position.
   * Returns the mapped account if found, otherwise returns the original.
   */
  async resolveAccounts(
    tenantId: string,
    fiscalPositionId: string,
    accountId: string,
  ): Promise<string> {
    const mapping = await this.fiscalPositionAccountsRepository.findOne({
      tenantId,
      where: { fiscalPositionId, accountSrcId: accountId },
    });

    if (mapping) {
      const m = mapping as unknown as Record<string, unknown>;
      return m.accountDestId as string;
    }

    return accountId;
  }
}
