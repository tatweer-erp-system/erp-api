import { Injectable } from '@nestjs/common';
import { JobPositionsRepository } from '@/database/sql/repositories/job-positions.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { CreateJobPositionDto } from '../dto/create-job-position.dto';
import { UpdateJobPositionDto } from '../dto/update-job-position.dto';

@Injectable()
export class JobPositionsService {
  constructor(private readonly jobPositionsRepository: JobPositionsRepository) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.jobPositionsRepository.findAll({
      ...query,
      tenantId,
      searchFields: ['nameEn', 'nameAr'],
    });
  }

  async findById(tenantId: string, id: string) {
    return this.jobPositionsRepository.findById(id, { tenantId });
  }

  async create(tenantId: string, dto: CreateJobPositionDto, auditContext: AuditContext) {
    return this.jobPositionsRepository.create({ ...dto } as any, { tenantId, auditContext });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateJobPositionDto,
    auditContext: AuditContext,
  ) {
    return this.jobPositionsRepository.update(id, { ...dto } as any, { tenantId, auditContext });
  }

  async delete(tenantId: string, id: string, auditContext: AuditContext) {
    return this.jobPositionsRepository.softDelete(id, { tenantId, auditContext });
  }
}
