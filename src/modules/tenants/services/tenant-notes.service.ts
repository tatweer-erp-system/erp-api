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
      searchFields: ['content'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      where: { tenantId: tenantId },
    });
  }

  async create(
    tenantId: string,
    dto: CreateTenantNoteDto,
    createdByName: string,
    auditContext?: AuditContext,
  ) {
    return this.tenantNotesRepository.create(
      {
        tenantId,
        content: dto.content,
        priority: dto.priority ?? 'normal',
        linkedTicketId: dto.linkedTicketId ?? null,
        createdByName,
      } as any,
      { auditContext },
    );
  }

  async update(id: string, dto: UpdateTenantNoteDto, auditContext?: AuditContext) {
    return this.tenantNotesRepository.update(id, dto as any, { auditContext });
  }

  async remove(id: string, auditContext?: AuditContext) {
    await this.tenantNotesRepository.softDelete(id, { auditContext });
  }
}
