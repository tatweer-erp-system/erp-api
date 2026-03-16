import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PosTerminalsRepository } from '@/database/sql/repositories/pos-terminals.repository';
import { CreateTerminalDto } from '../dto/create-terminal.dto';
import { UpdateTerminalDto } from '../dto/update-terminal.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class TerminalsService {
  constructor(private readonly posTerminalsRepository: PosTerminalsRepository) {}

  async findAll(_tenantId: string, pagination: PaginationDto) {
    return this.posTerminalsRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
    });
  }

  async findById(_tenantId: string, id: string) {
    return this.posTerminalsRepository.findById(id);
  }

  async create(
    _tenantId: string,
    dto: CreateTerminalDto,
    auditContext: { userId?: string; tenantId?: string },
  ) {
    return this.posTerminalsRepository.create({
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      branchId: dto.branchId,
      isActive: dto.isActive ?? true,
      settings: dto.settings ?? null,
      createdBy: auditContext.userId ?? null,
    });
  }

  async update(
    _tenantId: string,
    id: string,
    dto: UpdateTerminalDto,
    auditContext: { userId?: string; tenantId?: string },
  ) {
    const existing = await this.posTerminalsRepository.findById(id);
    if (existing.version !== dto.version) {
      throw new BadRequestException(msg(ErrorMessages.TERMINAL_VERSION_CONFLICT));
    }

    const updates: Record<string, unknown> = { updatedBy: auditContext.userId ?? null };
    if (dto.nameEn !== undefined) updates.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) updates.nameAr = dto.nameAr;
    if (dto.branchId !== undefined) updates.branchId = dto.branchId;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;
    if (dto.settings !== undefined) updates.settings = dto.settings;

    return this.posTerminalsRepository.update(id, updates as any);
  }

  async remove(
    _tenantId: string,
    id: string,
    auditContext: { userId?: string; tenantId?: string },
  ): Promise<void> {
    await this.posTerminalsRepository.softDelete(id);
  }

  async ping(id: string): Promise<void> {
    const terminal = await this.posTerminalsRepository.findByIdOrNull(id);
    if (!terminal) {
      throw new NotFoundException(msg(ErrorMessages.TERMINAL_NOT_FOUND, id));
    }
    await this.posTerminalsRepository.update(id, { lastSeenAt: new Date() });
  }

  async findActiveById(_tenantId: string, id: string) {
    const terminal = await this.posTerminalsRepository.findByIdOrNull(id);
    if (!terminal) {
      throw new NotFoundException(msg(ErrorMessages.TERMINAL_NOT_FOUND, id));
    }
    if (!terminal.isActive) {
      throw new BadRequestException(msg(ErrorMessages.TERMINAL_INACTIVE));
    }
    return terminal;
  }
}
