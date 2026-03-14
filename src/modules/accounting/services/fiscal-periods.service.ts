import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Transaction } from 'sequelize';
import { FiscalPeriodsRepository } from '@/database/sql/repositories/fiscal-periods.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { FiscalPeriodStatus } from '@/common/enums/accounting.enums';
import { FiscalPeriod } from '@/database/sql/entities/fiscal-period.entity';
import { CreateFiscalPeriodDto } from '../dto/create-fiscal-period.dto';
import { UpdateFiscalPeriodDto } from '../dto/update-fiscal-period.dto';

@Injectable()
export class FiscalPeriodsService {
  private readonly logger = new Logger(FiscalPeriodsService.name);

  constructor(private readonly periodsRepository: FiscalPeriodsRepository) {}

  async findAll(tenantId: string) {
    const periods = await this.periodsRepository.findByTenant(tenantId);
    return { data: periods };
  }

  async findById(tenantId: string, id: number) {
    const period = await this.periodsRepository.findByIdAndTenant(id, tenantId);
    if (!period) throw new NotFoundException(msg(ErrorMessages.PERIOD_NOT_FOUND, String(id)));
    return period;
  }

  async create(tenantId: string, dto: CreateFiscalPeriodDto, auditContext: AuditContext) {
    return this.periodsRepository.create(
      {
        tenantId,
        fiscalYear: dto.fiscalYear,
        periodNumber: dto.periodNumber,
        periodType: dto.periodType,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: FiscalPeriodStatus.OPEN,
      } as any,
      { bypassTenantScope: true, auditContext },
    );
  }

  async update(
    tenantId: string,
    id: number,
    dto: UpdateFiscalPeriodDto,
    auditContext: AuditContext,
  ) {
    const period = await this.periodsRepository.findByIdAndTenant(id, tenantId);
    if (!period) throw new NotFoundException(msg(ErrorMessages.PERIOD_NOT_FOUND, String(id)));

    const updateData: Record<string, unknown> = {};
    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) updateData.nameAr = dto.nameAr;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate;
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate;

    return this.periodsRepository.update(String(id), updateData as any, {
      bypassTenantScope: true,
      auditContext,
    });
  }

  async close(tenantId: string, id: number, auditContext: AuditContext) {
    const period = await this.periodsRepository.findByIdAndTenant(id, tenantId);
    if (!period) throw new NotFoundException(msg(ErrorMessages.PERIOD_NOT_FOUND, String(id)));

    const periodRecord = period as unknown as Record<string, unknown>;
    if (periodRecord.status !== FiscalPeriodStatus.OPEN) {
      throw new BadRequestException(
        msg(ErrorMessages.PERIOD_NOT_OPEN, String(periodRecord.status)),
      );
    }

    const draftNumbers = await this.periodsRepository.getDraftEntryNumbers(tenantId, id);
    if (draftNumbers.length > 0) {
      throw new ConflictException(msg(ErrorMessages.PERIOD_HAS_DRAFTS, draftNumbers.join(', ')));
    }

    return this.periodsRepository.update(
      String(id),
      {
        status: FiscalPeriodStatus.CLOSED,
        closedBy: auditContext.userId ?? null,
        closedAt: new Date(),
      } as any,
      { bypassTenantScope: true, auditContext },
    );
  }

  async reopen(tenantId: string, id: number, auditContext: AuditContext) {
    const period = await this.periodsRepository.findByIdAndTenant(id, tenantId);
    if (!period) throw new NotFoundException(msg(ErrorMessages.PERIOD_NOT_FOUND, String(id)));

    const periodRecord = period as unknown as Record<string, unknown>;
    if (periodRecord.status === FiscalPeriodStatus.LOCKED) {
      throw new BadRequestException(msg(ErrorMessages.PERIOD_REOPEN_LOCKED));
    }

    if (periodRecord.status === FiscalPeriodStatus.OPEN) {
      throw new BadRequestException(msg(ErrorMessages.PERIOD_ALREADY_OPEN));
    }

    return this.periodsRepository.update(
      String(id),
      {
        status: FiscalPeriodStatus.OPEN,
        closedBy: null,
        closedAt: null,
      } as any,
      { bypassTenantScope: true, auditContext },
    );
  }

  async lock(tenantId: string, id: number, auditContext: AuditContext) {
    const period = await this.periodsRepository.findByIdAndTenant(id, tenantId);
    if (!period) throw new NotFoundException(msg(ErrorMessages.PERIOD_NOT_FOUND, String(id)));

    const periodRecord = period as unknown as Record<string, unknown>;
    if (periodRecord.status === FiscalPeriodStatus.LOCKED) {
      throw new BadRequestException(msg(ErrorMessages.PERIOD_ALREADY_LOCKED));
    }

    return this.periodsRepository.update(String(id), { status: FiscalPeriodStatus.LOCKED } as any, {
      bypassTenantScope: true,
      auditContext,
    });
  }

  /**
   * Resolves the fiscal period for a given date.
   * Throws if closed/locked or not found.
   */
  async resolvePeriod(
    tenantId: string,
    date: string,
    transaction?: Transaction,
  ): Promise<FiscalPeriod> {
    const period = await this.periodsRepository.findPeriodForDate(tenantId, date, transaction);

    if (!period) {
      throw new BadRequestException(msg(ErrorMessages.PERIOD_NOT_FOUND, date));
    }

    const periodRecord = period as unknown as Record<string, unknown>;
    if (
      periodRecord.status === FiscalPeriodStatus.CLOSED ||
      periodRecord.status === FiscalPeriodStatus.LOCKED
    ) {
      throw new BadRequestException(msg(ErrorMessages.PERIOD_CLOSED, date));
    }

    return period;
  }
}
