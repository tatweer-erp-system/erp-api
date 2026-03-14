import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PosTerminalsRepository } from '@/database/sql/repositories/pos-terminals.repository';
import { CreateTerminalDto } from '../dto/create-terminal.dto';
import { UpdateTerminalDto } from '../dto/update-terminal.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class TerminalsService {
  constructor(private readonly posTerminalsRepository: PosTerminalsRepository) {}

  async findAll(tenantId: string, pagination: PaginationDto) {
    return this.posTerminalsRepository.findAll({
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
    return this.posTerminalsRepository.findById(id, { tenantId });
  }

  async create(tenantId: string, dto: CreateTerminalDto, auditContext: AuditContext) {
    return this.posTerminalsRepository.create(
      {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        branchId: dto.branchId,
        isActive: dto.isActive ?? true,
        settings: dto.settings ?? {},
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(tenantId: string, id: string, dto: UpdateTerminalDto, auditContext: AuditContext) {
    const existing = await this.posTerminalsRepository.findById(id, { tenantId });
    if (existing.version !== dto.version) {
      throw new BadRequestException(msg(ErrorMessages.TERMINAL_VERSION_CONFLICT));
    }

    const updates: Record<string, unknown> = { version: dto.version + 1 };
    if (dto.nameEn !== undefined) updates.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) updates.nameAr = dto.nameAr;
    if (dto.branchId !== undefined) updates.branchId = dto.branchId;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;
    if (dto.settings !== undefined) updates.settings = dto.settings;

    return this.posTerminalsRepository.update(id, updates as any, { tenantId, auditContext });
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext): Promise<void> {
    await this.posTerminalsRepository.softDelete(id, { tenantId, auditContext });
  }

  async ping(id: string): Promise<void> {
    const terminal = await this.posTerminalsRepository.findByIdOrNull(id, {
      bypassTenantScope: true,
    });
    if (!terminal) {
      throw new NotFoundException(msg(ErrorMessages.TERMINAL_NOT_FOUND, id));
    }
    await this.posTerminalsRepository.update(id, { lastSeenAt: new Date() } as any, {
      bypassTenantScope: true,
    });
  }

  async findActiveById(tenantId: string, id: string) {
    const terminal = await this.posTerminalsRepository.findByIdOrNull(id, { tenantId });
    if (!terminal) {
      throw new NotFoundException(msg(ErrorMessages.TERMINAL_NOT_FOUND, id));
    }
    if (!terminal.isActive) {
      throw new BadRequestException(msg(ErrorMessages.TERMINAL_INACTIVE));
    }
    return terminal;
  }
}
