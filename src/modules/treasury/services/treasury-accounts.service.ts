import { BadRequestException, Injectable } from '@nestjs/common';

import { TreasuryAccountsRepository } from '@/database/sql/repositories/treasury-accounts.repository';
import { CreateTreasuryAccountDto } from '../dto/create-treasury-account.dto';
import { UpdateTreasuryAccountDto } from '../dto/update-treasury-account.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { PaginationDto } from '@/common/dto/pagination.dto';

const SAUDI_IBAN_REGEX = /^SA\d{22}$/;

@Injectable()
export class TreasuryAccountsService {
  constructor(private readonly accountsRepository: TreasuryAccountsRepository) {}

  async create(
    branchId: string,
    dto: CreateTreasuryAccountDto,
    _auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    // Validate IBAN if provided
    if ((dto as any).iban && !SAUDI_IBAN_REGEX.test((dto as any).iban)) {
      throw new BadRequestException(msg(ErrorMessages.IBAN_INVALID, (dto as any).iban));
    }

    return this.accountsRepository.create({
      branchId: (dto as any).branchId ?? branchId,
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      accountType: (dto as any).type ?? (dto as any).accountType,
      balance: 0,
      coaAccountId: (dto as any).coaAccountId ?? null,
      bankName: (dto as any).bankName ?? null,
      bankAccountNumber: (dto as any).accountNumber ?? (dto as any).bankAccountNumber ?? null,
      iban: (dto as any).iban ?? null,
      isActive: (dto as any).isActive ?? true,
    });
  }

  async findAll(branchId: string, pagination: PaginationDto) {
    return this.accountsRepository.findAll(branchId, undefined, pagination.page, pagination.limit);
  }

  async findById(branchId: string, id: string) {
    const account = await this.accountsRepository.findByIdOrNull(id);
    if (!account) {
      throw new BadRequestException(msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, id));
    }
    return account;
  }

  async update(
    branchId: string,
    id: string,
    dto: UpdateTreasuryAccountDto,
    _auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    // Validate account exists
    const account = await this.accountsRepository.findByIdOrNull(id);
    if (!account) {
      throw new BadRequestException(msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, id));
    }

    // Validate IBAN if provided
    if ((dto as any).iban && !SAUDI_IBAN_REGEX.test((dto as any).iban)) {
      throw new BadRequestException(msg(ErrorMessages.IBAN_INVALID, (dto as any).iban));
    }

    return this.accountsRepository.update(id, dto as any);
  }

  async remove(branchId: string, id: string, _auditContext: AuditContext) {
    const account = await this.accountsRepository.findByIdOrNull(id);
    if (!account) {
      throw new BadRequestException(msg(ErrorMessages.TREASURY_ACCOUNT_NOT_FOUND, id));
    }
    await this.accountsRepository.softDelete(id);
  }
}
