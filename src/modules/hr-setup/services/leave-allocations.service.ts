import { Injectable, BadRequestException } from '@nestjs/common';
import { LeaveAllocationsRepository } from '@/database/sql/repositories/leave-allocations.repository';
import { LeaveTypesRepository } from '@/database/sql/repositories/leave-types.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { LeaveAllocationStatus } from '@/common/enums/hr-new.enums';
import { CreateLeaveAllocationDto } from '../dto/create-leave-allocation.dto';
import { UpdateLeaveAllocationDto } from '../dto/update-leave-allocation.dto';

@Injectable()
export class LeaveAllocationsService {
  constructor(
    private readonly leaveAllocationsRepository: LeaveAllocationsRepository,
    private readonly leaveTypesRepository: LeaveTypesRepository,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.leaveAllocationsRepository.findAll({ ...query, tenantId });
  }

  async findById(tenantId: string, id: string) {
    return this.leaveAllocationsRepository.findById(id, { tenantId });
  }

  async create(tenantId: string, dto: CreateLeaveAllocationDto, auditContext: AuditContext) {
    // Validate leave type exists
    await this.leaveTypesRepository.findById(dto.leaveTypeId, { tenantId });

    return this.leaveAllocationsRepository.create(
      {
        ...dto,
        status: LeaveAllocationStatus.DRAFT,
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateLeaveAllocationDto,
    auditContext: AuditContext,
  ) {
    const allocation = await this.leaveAllocationsRepository.findById(id, { tenantId });
    const alloc = allocation as any;

    if (
      alloc.status === LeaveAllocationStatus.APPROVED ||
      alloc.status === LeaveAllocationStatus.REFUSED
    ) {
      throw new BadRequestException('Cannot update an approved or refused allocation.');
    }

    return this.leaveAllocationsRepository.update(id, { ...dto } as any, {
      tenantId,
      auditContext,
    });
  }

  async delete(tenantId: string, id: string, auditContext: AuditContext) {
    const allocation = await this.leaveAllocationsRepository.findById(id, { tenantId });
    const alloc = allocation as any;

    if (alloc.status === LeaveAllocationStatus.APPROVED) {
      throw new BadRequestException('Cannot delete an approved allocation.');
    }

    return this.leaveAllocationsRepository.softDelete(id, { tenantId, auditContext });
  }

  async approve(tenantId: string, id: string, auditContext: AuditContext) {
    const allocation = await this.leaveAllocationsRepository.findById(id, { tenantId });
    const alloc = allocation as any;

    if (
      alloc.status !== LeaveAllocationStatus.DRAFT &&
      alloc.status !== LeaveAllocationStatus.CONFIRMED
    ) {
      throw new BadRequestException('Only draft or confirmed allocations can be approved.');
    }

    return this.leaveAllocationsRepository.update(
      id,
      {
        status: LeaveAllocationStatus.APPROVED,
        approvedById: auditContext.userId ?? null,
        approvedAt: new Date(),
        version: alloc.version,
      } as any,
      { tenantId, auditContext },
    );
  }

  async refuse(tenantId: string, id: string, auditContext: AuditContext) {
    const allocation = await this.leaveAllocationsRepository.findById(id, { tenantId });
    const alloc = allocation as any;

    if (
      alloc.status !== LeaveAllocationStatus.DRAFT &&
      alloc.status !== LeaveAllocationStatus.CONFIRMED
    ) {
      throw new BadRequestException('Only draft or confirmed allocations can be refused.');
    }

    return this.leaveAllocationsRepository.update(
      id,
      {
        status: LeaveAllocationStatus.REFUSED,
        version: alloc.version,
      } as any,
      { tenantId, auditContext },
    );
  }
}
