import { Injectable } from '@nestjs/common';
import { LeaveTypesRepository } from '@/database/sql/repositories/leave-types.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { CreateLeaveTypeDto } from '../dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from '../dto/update-leave-type.dto';

@Injectable()
export class LeaveTypesService {
  constructor(private readonly leaveTypesRepository: LeaveTypesRepository) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.leaveTypesRepository.findAll({
      ...query,
      tenantId,
      searchFields: ['nameEn', 'nameAr'],
    });
  }

  async findById(tenantId: string, id: string) {
    return this.leaveTypesRepository.findById(id, { tenantId });
  }

  async create(tenantId: string, dto: CreateLeaveTypeDto, auditContext: AuditContext) {
    return this.leaveTypesRepository.create({ ...dto } as any, { tenantId, auditContext });
  }

  async update(tenantId: string, id: string, dto: UpdateLeaveTypeDto, auditContext: AuditContext) {
    return this.leaveTypesRepository.update(id, { ...dto } as any, { tenantId, auditContext });
  }

  async delete(tenantId: string, id: string, auditContext: AuditContext) {
    return this.leaveTypesRepository.softDelete(id, { tenantId, auditContext });
  }
}
