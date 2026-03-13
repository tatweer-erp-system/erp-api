import { BadRequestException, Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { TreasuryAccountsRepository } from '@/database/sql/repositories/treasury-accounts.repository';
import { CurrencyService } from '@/modules/currency/currency.service';
import { CreateTreasuryAccountDto } from '../dto/create-treasury-account.dto';
import { UpdateTreasuryAccountDto } from '../dto/update-treasury-account.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { PaginationDto } from '@/common/dto/pagination.dto';

const SAUDI_IBAN_REGEX = /^SA\d{22}$/;

@Injectable()
export class TreasuryAccountsService {
  constructor(
    private readonly accountsRepository: TreasuryAccountsRepository,
    private readonly currencyService: CurrencyService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateTreasuryAccountDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.accountsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // Validate IBAN if provided
      if (dto.iban && !SAUDI_IBAN_REGEX.test(dto.iban)) {
        throw new BadRequestException(msg(ErrorMessages.IBAN_INVALID, dto.iban));
      }

      // Validate currency exists and is active (or default to base)
      const currency = dto.currency
        ? dto.currency.toUpperCase()
        : ((await this.currencyService.getBaseCurrency(tenantId)).code as string);

      // If isDefault is being set to true, clear existing default
      if (dto.isDefault) {
        await this.accountsRepository.bulkUpdate({
          where: { isDefault: true },
          data: { isDefault: false } as any,
          tenantId,
          transaction,
        });
      }

      const account = await this.accountsRepository.create(
        {
          branchId: dto.branchId ?? null,
          name: dto.name,
          type: dto.type,
          currency,
          coaAccountId: dto.coaAccountId ?? null,
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
          bankName: dto.bankName ?? null,
          accountNumber: dto.accountNumber ?? null,
          iban: dto.iban ?? null,
          swiftCode: dto.swiftCode ?? null,
          currentBalance: 0,
        } as any,
        { tenantId, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();
      return account;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async findAll(tenantId: string, pagination: PaginationDto) {
    return this.accountsRepository.findAll({
      tenantId,
      page: pagination.page,
      limit: pagination.limit,
      search: pagination.search,
      searchFields: ['name'],
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    const account = await this.accountsRepository.findOne({
      tenantId,
      where: { id },
    });
    if (!account) {
      throw new BadRequestException(msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, id));
    }
    return account;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTreasuryAccountDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.accountsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // Validate account exists
      const account = await this.accountsRepository.findOne({
        tenantId,
        where: { id },
        transaction,
      });
      if (!account) {
        throw new BadRequestException(msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, id));
      }

      // Validate IBAN if provided
      if (dto.iban && !SAUDI_IBAN_REGEX.test(dto.iban)) {
        throw new BadRequestException(msg(ErrorMessages.IBAN_INVALID, dto.iban));
      }

      // If setting as default, clear others first
      if (dto.isDefault) {
        await this.accountsRepository.bulkUpdate({
          where: { isDefault: true },
          data: { isDefault: false } as any,
          tenantId,
          transaction,
        });
      }

      const updated = await this.accountsRepository.update(id, dto as any, {
        tenantId,
        transaction,
        auditContext,
      });

      if (isOwner) await transaction.commit();
      return updated;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const account = await this.accountsRepository.findOne({ tenantId, where: { id } });
    if (!account) {
      throw new BadRequestException(msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, id));
    }
    await this.accountsRepository.softDelete(id, { tenantId, auditContext });
  }
}
