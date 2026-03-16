import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { TrainingRecordsRepository } from '@/database/sql/repositories/training-records.repository';
import { EmployeesRepository } from '@/database/sql/repositories/employees.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { CreateTrainingDto } from '../dto/create-training.dto';
import { UpdateTrainingDto } from '../dto/update-training.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(
    private readonly trainingRecordsRepository: TrainingRecordsRepository,
    private readonly employeesRepository: EmployeesRepository,
    private readonly outboxService: OutboxSharedService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(
    branchId: string,
    dto: CreateTrainingDto,
    _auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    return this.dataSource.transaction(async (_manager) => {
      // Verify employee exists
      const employee = await this.employeesRepository.findByIdOrNull((dto as any).employeeId);
      if (!employee) {
        throw new NotFoundException(
          msg(ErrorMessages.NOT_FOUND, 'Employee', (dto as any).employeeId),
        );
      }

      const record = await this.trainingRecordsRepository.create({
        branchId,
        employeeId: (dto as any).employeeId,
        trainingName: (dto as any).courseName ?? (dto as any).trainingName,
        provider: (dto as any).provider ?? null,
        startDate: (dto as any).startDate,
        endDate: (dto as any).endDate ?? null,
        cost: (dto as any).cost ?? null,
        certificateUrl: (dto as any).certificateUrl ?? null,
        notes: (dto as any).notes ?? null,
      });

      return record;
    });
  }

  async findAll(branchId: string, query: PaginationDto & { employeeId?: string }) {
    return this.trainingRecordsRepository.findAll(
      branchId,
      query.employeeId,
      query.page,
      query.limit,
    );
  }

  async findById(branchId: string, id: string) {
    const record = await this.trainingRecordsRepository.findByIdOrNull(id);
    if (!record) throw new NotFoundException(msg(ErrorMessages.TRAINING_NOT_FOUND, id));
    return record;
  }

  async update(
    branchId: string,
    id: string,
    dto: UpdateTrainingDto,
    _auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    return this.dataSource.transaction(async (_manager) => {
      const existing = await this.trainingRecordsRepository.findByIdOrNull(id);
      if (!existing) throw new NotFoundException(msg(ErrorMessages.TRAINING_NOT_FOUND, id));

      const updates: Record<string, unknown> = {};
      if ((dto as any).trainingName !== undefined) updates.trainingName = (dto as any).trainingName;
      if ((dto as any).courseName !== undefined) updates.trainingName = (dto as any).courseName;
      if ((dto as any).provider !== undefined) updates.provider = (dto as any).provider;
      if ((dto as any).startDate !== undefined) updates.startDate = (dto as any).startDate;
      if ((dto as any).endDate !== undefined) updates.endDate = (dto as any).endDate;
      if ((dto as any).cost !== undefined) updates.cost = (dto as any).cost;
      if ((dto as any).certificateUrl !== undefined)
        updates.certificateUrl = (dto as any).certificateUrl;
      if ((dto as any).notes !== undefined) updates.notes = (dto as any).notes;

      return this.trainingRecordsRepository.update(id, updates as any);
    });
  }

  async remove(branchId: string, id: string, _auditContext: AuditContext) {
    const record = await this.trainingRecordsRepository.findByIdOrNull(id);
    if (!record) throw new NotFoundException(msg(ErrorMessages.TRAINING_NOT_FOUND, id));
    await this.trainingRecordsRepository.softDelete(id);
  }
}
