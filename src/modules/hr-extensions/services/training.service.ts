import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { TrainingRecordsRepository } from '@/database/sql/repositories/training-records.repository';
import { EmployeesRepository } from '@/database/sql/repositories/employees.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { CreateTrainingDto } from '../dto/create-training.dto';
import { UpdateTrainingDto } from '../dto/update-training.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { TrainingStatus } from '@/common/enums/hr.enums';

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(
    private readonly trainingRecordsRepository: TrainingRecordsRepository,
    private readonly employeesRepository: EmployeesRepository,
    private readonly outboxService: OutboxSharedService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateTrainingDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.trainingRecordsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // Verify employee exists
      const employee = await this.employeesRepository.findByIdOrNull(dto.employeeId, {
        tenantId,
        transaction,
      });
      if (!employee) {
        throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Employee', dto.employeeId));
      }

      const record = await this.trainingRecordsRepository.create(
        {
          employeeId: dto.employeeId,
          courseName: dto.courseName,
          provider: dto.provider ?? null,
          trainingType: dto.trainingType ?? 'internal',
          startDate: dto.startDate,
          endDate: dto.endDate ?? null,
          durationHours: dto.durationHours ?? null,
          status: dto.status ?? TrainingStatus.PLANNED,
          score: dto.score ?? null,
          certificateNumber: dto.certificateNumber ?? null,
          certificateUrl: dto.certificateUrl ?? null,
          certificateExpiry: dto.certificateExpiry ?? null,
          cost: dto.cost ?? null,
          notes: dto.notes ?? null,
        } as any,
        { tenantId, auditContext, transaction },
      );

      if (dto.status === TrainingStatus.COMPLETED) {
        await this._emitCompletionEvent(tenantId, record, transaction);
      }

      if (isOwner) await transaction.commit();
      return record;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async findAll(tenantId: string, query: PaginationDto & { employeeId?: string }) {
    const where: Record<string, unknown> = {};
    if (query.employeeId) where.employeeId = query.employeeId;

    return this.trainingRecordsRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['courseName'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      where,
    });
  }

  async findById(tenantId: string, id: string) {
    const record = await this.trainingRecordsRepository.findByIdOrNull(id, { tenantId });
    if (!record) throw new NotFoundException(msg(ErrorMessages.TRAINING_NOT_FOUND, id));
    return record;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTrainingDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.trainingRecordsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const existing = await this.trainingRecordsRepository.findByIdOrNull(id, {
        tenantId,
        transaction,
      });
      if (!existing) throw new NotFoundException(msg(ErrorMessages.TRAINING_NOT_FOUND, id));

      const wasCompleted = (existing as any).status === TrainingStatus.COMPLETED;
      const becomingCompleted = dto.status === TrainingStatus.COMPLETED && !wasCompleted;

      const updated = await this.trainingRecordsRepository.update(id, dto as any, {
        tenantId,
        transaction,
        auditContext,
      });

      if (becomingCompleted) {
        await this._emitCompletionEvent(tenantId, updated, transaction);
      }

      if (isOwner) await transaction.commit();
      return updated;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const record = await this.trainingRecordsRepository.findByIdOrNull(id, { tenantId });
    if (!record) throw new NotFoundException(msg(ErrorMessages.TRAINING_NOT_FOUND, id));
    await this.trainingRecordsRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async _emitCompletionEvent(
    tenantId: string,
    record: any,
    transaction: Transaction,
  ): Promise<void> {
    try {
      await this.outboxService.createEvent({
        tenantId,
        eventType: 'training.completed',
        payload: {
          trainingRecordId: record.id,
          employeeId: record.employeeId,
          courseName: record.courseName,
          score: record.score,
          passed: record.passed,
          certificateUrl: record.certificateUrl,
        },
        referenceId: record.id,
        referenceType: 'training_record',
        transaction,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to emit training.completed outbox event for record ${record.id}`,
        err,
      );
    }
  }
}
