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

  async findAll(tenantId: string, pagination: PaginationDto) {
    return this.programsRepository.findAll({
      tenantId,
      page: pagination.page,
      limit: pagination.limit,
      search: pagination.search,
      searchFields: ['nameEn', 'nameAr'],
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    const program = await this.programsRepository.findById(id, { tenantId });
    const tiers = await this.tiersRepository.findAllRaw({
      where: { programId: id },
      order: [['sortOrder', 'ASC']],
    });
    return { ...program, tiers };
  }

  async create(tenantId: string, dto: CreateProgramDto, auditContext: AuditContext) {
    return this.programsRepository.create(
      {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        descriptionEn: dto.descriptionEn ?? null,
        descriptionAr: dto.descriptionAr ?? null,
        isActive: dto.isActive ?? true,
        pointsPerCurrency: dto.pointsPerCurrency ?? 1.0,
        currencyPerPoint: dto.currencyPerPoint ?? 0.05,
        expiryDays: dto.expiryDays ?? null,
        minRedeemPoints: dto.minRedeemPoints ?? 100,
        maxRedeemPct: dto.maxRedeemPct ?? 50.0,
        settings: dto.settings ?? {},
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(tenantId: string, id: string, dto: UpdateProgramDto, auditContext: AuditContext) {
    const data: Record<string, unknown> = {};
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr;
    if (dto.descriptionEn !== undefined) data.descriptionEn = dto.descriptionEn;
    if (dto.descriptionAr !== undefined) data.descriptionAr = dto.descriptionAr;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.pointsPerCurrency !== undefined) data.pointsPerCurrency = dto.pointsPerCurrency;
    if (dto.currencyPerPoint !== undefined) data.currencyPerPoint = dto.currencyPerPoint;
    if (dto.expiryDays !== undefined) data.expiryDays = dto.expiryDays;
    if (dto.minRedeemPoints !== undefined) data.minRedeemPoints = dto.minRedeemPoints;
    if (dto.maxRedeemPct !== undefined) data.maxRedeemPct = dto.maxRedeemPct;
    if (dto.settings !== undefined) data.settings = dto.settings;

    return this.programsRepository.update(id, data as any, { tenantId, auditContext });
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    await this.programsRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Tier management ─────────────────────────────────────────────────────────

  async createTier(tenantId: string, programId: string, dto: CreateTierDto) {
    // Verify program exists and belongs to tenant
    await this.programsRepository.findById(programId, { tenantId });

    return this.tiersRepository.create(
      {
        programId: programId,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        descriptionEn: dto.descriptionEn ?? null,
        descriptionAr: dto.descriptionAr ?? null,
        minPoints: dto.minPoints ?? 0,
        earnMultiplier: dto.earnMultiplier ?? 1.0,
        redeemMultiplier: dto.redeemMultiplier ?? 1.0,
        color: dto.color ?? '#CD7F32',
        benefits: dto.benefits ?? [],
        sortOrder: dto.sortOrder ?? 0,
      } as any,
      {},
    );
  }

  async updateTier(tenantId: string, programId: string, tierId: string, dto: UpdateTierDto) {
    // Verify program exists and belongs to tenant
    await this.programsRepository.findById(programId, { tenantId });

    // Verify tier belongs to this program
    const tier = await this.tiersRepository.findOne({
      where: { id: tierId, programId: programId },
    });
    if (!tier) {
      throw new NotFoundException(
        msg(ErrorMessages.LOYALTY_TIER_NOT_IN_PROGRAM, tierId, programId),
      );
    }

    const data: Record<string, unknown> = {};
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr;
    if (dto.descriptionEn !== undefined) data.descriptionEn = dto.descriptionEn;
    if (dto.descriptionAr !== undefined) data.descriptionAr = dto.descriptionAr;
    if (dto.minPoints !== undefined) data.minPoints = dto.minPoints;
    if (dto.earnMultiplier !== undefined) data.earnMultiplier = dto.earnMultiplier;
    if (dto.redeemMultiplier !== undefined) data.redeemMultiplier = dto.redeemMultiplier;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.benefits !== undefined) data.benefits = dto.benefits;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    return this.tiersRepository.update(tierId, data as any, {});
  }

  async removeTier(tenantId: string, programId: string, tierId: string) {
    // Verify program exists and belongs to tenant
    await this.programsRepository.findById(programId, { tenantId });

    // Verify tier belongs to this program
    const tier = await this.tiersRepository.findOne({
      where: { id: tierId, programId: programId },
    });
    if (!tier) {
      throw new NotFoundException(
        msg(ErrorMessages.LOYALTY_TIER_NOT_IN_PROGRAM, tierId, programId),
      );
    }

    await this.tiersRepository.hardDelete(tierId, {});
  }
}
