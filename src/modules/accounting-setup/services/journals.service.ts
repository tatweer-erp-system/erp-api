import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { JournalsRepository } from '@/database/sql/repositories/journals.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { CreateJournalDto } from '../dto/create-journal.dto';
import { UpdateJournalDto } from '../dto/update-journal.dto';
import { FilterJournalDto } from '../dto/filter-journal.dto';

@Injectable()
export class JournalsService {
  constructor(private readonly journalsRepository: JournalsRepository) {}

  async findAll(tenantId: string, query: FilterJournalDto) {
    const where: Record<string, unknown> = {};
    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return this.journalsRepository.findAll({
      tenantId,
      where,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['nameEn', 'nameAr', 'code'],
      sortBy: query.sortBy ?? 'code',
      sortOrder: query.sortOrder ?? 'ASC',
    });
  }

  async findById(tenantId: string, id: string) {
    return this.journalsRepository.findById(id, { tenantId });
  }

  async create(tenantId: string, dto: CreateJournalDto, auditContext: AuditContext) {
    const exists = await this.journalsRepository.existsByCode(tenantId, dto.code);
    if (exists) {
      throw new ConflictException(msg(ErrorMessages.JOURNAL_CODE_DUPLICATE, dto.code));
    }

    return this.journalsRepository.create(
      {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        type: dto.type,
        code: dto.code,
        defaultAccountId: dto.defaultAccountId ?? null,
        suspenseAccountId: dto.suspenseAccountId ?? null,
        currencyId: dto.currencyId ?? null,
        sequencePrefix: dto.sequencePrefix ?? null,
        isActive: dto.isActive ?? true,
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(tenantId: string, id: string, dto: UpdateJournalDto, auditContext: AuditContext) {
    const existing = await this.journalsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) throw new NotFoundException(msg(ErrorMessages.JOURNAL_SETUP_NOT_FOUND, id));

    if (dto.code) {
      const record = existing as unknown as Record<string, unknown>;
      if (dto.code !== record.code) {
        const duplicate = await this.journalsRepository.existsByCode(tenantId, dto.code);
        if (duplicate) {
          throw new ConflictException(msg(ErrorMessages.JOURNAL_CODE_DUPLICATE, dto.code));
        }
      }
    }

    const { version: _version, ...updateData } = dto;
    return this.journalsRepository.update(id, updateData as any, { tenantId, auditContext });
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.journalsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) throw new NotFoundException(msg(ErrorMessages.JOURNAL_SETUP_NOT_FOUND, id));

    await this.journalsRepository.softDelete(id, { tenantId, auditContext });
  }
}
