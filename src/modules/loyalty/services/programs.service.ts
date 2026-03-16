import { Injectable, NotFoundException } from '@nestjs/common';
import { LoyaltyProgramsRepository } from '@/database/sql/repositories/loyalty-programs.repository';
import { LoyaltyTiersRepository } from '@/database/sql/repositories/loyalty-tiers.repository';
import { CreateProgramDto } from '../dto/create-program.dto';
import { UpdateProgramDto } from '../dto/update-program.dto';
import { CreateTierDto } from '../dto/create-tier.dto';
import { UpdateTierDto } from '../dto/update-tier.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class ProgramsService {
  constructor(
    private readonly programsRepository: LoyaltyProgramsRepository,
    private readonly tiersRepository: LoyaltyTiersRepository,
  ) {}

  async findAll(_tenantId: string, _pagination: PaginationDto) {
    return this.programsRepository.findAll();
  }

  async findById(_tenantId: string, id: string) {
    return this.programsRepository.findWithTiers(id);
  }

  async create(_tenantId: string, dto: CreateProgramDto, _auditContext: AuditContext) {
    return this.programsRepository.create({
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      isActive: dto.isActive ?? true,
      pointsPerCurrency: dto.pointsPerCurrency ?? 1.0,
      currencyPerPoint: dto.currencyPerPoint ?? 0.05,
      expiryDays: dto.expiryDays ?? null,
      minRedeemPoints: dto.minRedeemPoints ?? 100,
    });
  }

  async update(_tenantId: string, id: string, dto: UpdateProgramDto, _auditContext: AuditContext) {
    const program = await this.programsRepository.findById(id);
    const data: Partial<typeof program> = {};
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.pointsPerCurrency !== undefined) data.pointsPerCurrency = dto.pointsPerCurrency;
    if (dto.currencyPerPoint !== undefined) data.currencyPerPoint = dto.currencyPerPoint;
    if (dto.expiryDays !== undefined) data.expiryDays = dto.expiryDays ?? null;
    if (dto.minRedeemPoints !== undefined) data.minRedeemPoints = dto.minRedeemPoints;
    return this.programsRepository.update(id, program.version, data);
  }

  async remove(_tenantId: string, id: string, _auditContext: AuditContext) {
    await this.programsRepository.softDelete(id);
  }

  // ── Tier management ─────────────────────────────────────────────────────────

  async createTier(_tenantId: string, programId: string, dto: CreateTierDto) {
    await this.programsRepository.findById(programId);

    return this.tiersRepository.create({
      programId,
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      minPoints: dto.minPoints ?? 0,
      bonusMultiplier: dto.earnMultiplier ?? 1.0,
      sequence: dto.sortOrder ?? 0,
    });
  }

  async updateTier(_tenantId: string, programId: string, tierId: string, dto: UpdateTierDto) {
    await this.programsRepository.findById(programId);

    const tier = await this.tiersRepository.findOne({
      where: { id: tierId, programId },
    });
    if (!tier) {
      throw new NotFoundException(
        msg(ErrorMessages.LOYALTY_TIER_NOT_IN_PROGRAM, tierId, programId),
      );
    }

    const data: Partial<typeof tier> = {};
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr;
    if (dto.minPoints !== undefined) data.minPoints = dto.minPoints;
    if (dto.earnMultiplier !== undefined) data.bonusMultiplier = dto.earnMultiplier;
    if (dto.sortOrder !== undefined) data.sequence = dto.sortOrder;

    return this.tiersRepository.update(tierId, data);
  }

  async removeTier(_tenantId: string, programId: string, tierId: string) {
    await this.programsRepository.findById(programId);

    const tier = await this.tiersRepository.findOne({
      where: { id: tierId, programId },
    });
    if (!tier) {
      throw new NotFoundException(
        msg(ErrorMessages.LOYALTY_TIER_NOT_IN_PROGRAM, tierId, programId),
      );
    }

    await this.tiersRepository.hardDelete(tierId);
  }
}
