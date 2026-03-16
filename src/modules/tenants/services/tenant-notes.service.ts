import { Injectable } from '@nestjs/common';
import { TenantNotesRepository } from '@/database/sql/repositories/tenant-notes.repository';
import { CreateTenantNoteDto } from '../dto/create-tenant-note.dto';
import { UpdateTenantNoteDto } from '../dto/update-tenant-note.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class TenantNotesService {
  constructor(private readonly tenantNotesRepository: TenantNotesRepository) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.tenantNotesRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      tenantId,
    });
  }

  async create(
    tenantId: string,
    dto: CreateTenantNoteDto,
    createdByName: string,
    auditContext?: AuditContext,
  ) {
    return this.tenantNotesRepository.create({
      tenantId,
      content: dto.content,
      priority: (dto as any).priority ?? 'normal',
      linkedTicketId: (dto as any).linkedTicketId ?? null,
      createdByName,
      createdBy: auditContext?.userId ?? null,
    } as any);
  }

  async update(id: string, dto: UpdateTenantNoteDto, auditContext?: AuditContext) {
    return this.tenantNotesRepository.update(id, {
      ...(dto as any),
      updatedBy: auditContext?.userId ?? null,
    } as any);
  }

  async remove(id: string, auditContext?: AuditContext) {
    await this.tenantNotesRepository.softDelete(id);
  }
}
