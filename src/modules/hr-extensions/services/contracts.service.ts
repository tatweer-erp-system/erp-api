import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { EmployeeContractsRepository } from '@/database/sql/repositories/employee-contracts.repository';
import { EmployeesRepository } from '@/database/sql/repositories/employees.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { CreateContractDto } from '../dto/create-contract.dto';
import { UpdateContractDto } from '../dto/update-contract.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { ContractStatus } from '@/common/enums/hr.enums';
import { WageType } from '@/common/enums/hr-new.enums';

// Alert thresholds (days before contract expiry)
const CONTRACT_EXPIRY_ALERT_30_DAYS = 30;
const CONTRACT_EXPIRY_ALERT_7_DAYS = 7;

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly contractsRepository: EmployeeContractsRepository,
    private readonly employeesRepository: EmployeesRepository,
    private readonly outboxService: OutboxSharedService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateContractDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.contractsRepository.createTransaction({
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

      // Enforce one active contract per employee
      if (dto.status === ContractStatus.ACTIVE) {
        const existing = await this.contractsRepository.findActiveByEmployee(
          tenantId,
          dto.employeeId,
          transaction,
        );
        if (existing) {
          throw new BadRequestException(msg(ErrorMessages.CONTRACT_ALREADY_ACTIVE, dto.employeeId));
        }
      }

      const contract = await this.contractsRepository.create(
        {
          employeeId: dto.employeeId,
          contractType: dto.contractType,
          startDate: dto.startDate,
          endDate: dto.endDate ?? null,
          basicSalary: dto.basicSalary,
          housingAllowance: dto.housingAllowance ?? 0,
          transportationAllowance: dto.transportationAllowance ?? 0,
          wageType: dto.wageType ?? WageType.MONTHLY,
          wage: dto.wage ?? dto.basicSalary,
          salaryStructureId: dto.salaryStructureId ?? null,
          workingScheduleId: dto.workingScheduleId ?? null,
          status: dto.status ?? ContractStatus.DRAFT,
          notes: dto.notes ?? null,
        } as any,
        { tenantId, auditContext, transaction },
      );

      if (isOwner) await transaction.commit();
      return contract;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async findAll(tenantId: string, query: PaginationDto & { employeeId?: string; status?: string }) {
    const where: Record<string, unknown> = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;

    return this.contractsRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      where,
    });
  }

  async findById(tenantId: string, id: string) {
    const contract = await this.contractsRepository.findByIdOrNull(id, { tenantId });
    if (!contract) throw new NotFoundException(msg(ErrorMessages.CONTRACT_NOT_FOUND, id));
    return contract;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateContractDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.contractsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const existing = await this.contractsRepository.findByIdOrNull(id, {
        tenantId,
        transaction,
      });
      if (!existing) throw new NotFoundException(msg(ErrorMessages.CONTRACT_NOT_FOUND, id));

      // If activating, ensure no other active contract exists
      if (
        dto.status === ContractStatus.ACTIVE &&
        (existing as any).status !== ContractStatus.ACTIVE
      ) {
        const activeContract = await this.contractsRepository.findActiveByEmployee(
          tenantId,
          (existing as any).employeeId,
          transaction,
        );
        if (activeContract && (activeContract as any).id !== id) {
          throw new BadRequestException(
            msg(ErrorMessages.CONTRACT_ALREADY_ACTIVE, (existing as any).employeeId),
          );
        }
      }

      // Validate contract status lifecycle: Draft -> Active -> Expired -> Cancelled
      if (dto.status) {
        this._validateStatusTransition((existing as any).status, dto.status);
      }

      const updated = await this.contractsRepository.update(id, dto as any, {
        tenantId,
        transaction,
        auditContext,
      });

      if (isOwner) await transaction.commit();
      return updated;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const contract = await this.contractsRepository.findByIdOrNull(id, { tenantId });
    if (!contract) throw new NotFoundException(msg(ErrorMessages.CONTRACT_NOT_FOUND, id));
    await this.contractsRepository.softDelete(id, { tenantId, auditContext });
  }

  /**
   * Checks for contracts expiring in 30 days and 7 days and emits outbox alerts.
   * A cron job should periodically call this method.
   */
  async checkExpiryAlerts(tenantId: string): Promise<void> {
    for (const daysAhead of [CONTRACT_EXPIRY_ALERT_30_DAYS, CONTRACT_EXPIRY_ALERT_7_DAYS]) {
      try {
        const contracts = await this.contractsRepository.findExpiringContracts(tenantId, daysAhead);

        for (const contract of contracts) {
          const sequelize = this.contractsRepository.getSequelize();
          const transaction = await sequelize.transaction();
          try {
            await this.outboxService.createEvent({
              tenantId,
              eventType: 'contract.expiring_soon',
              payload: {
                contractId: (contract as any).id,
                employeeId: (contract as any).employeeId,
                endDate: (contract as any).endDate,
                daysRemaining: daysAhead,
              },
              referenceId: (contract as any).id,
              referenceType: 'employee_contract',
              transaction,
            });
            await transaction.commit();
          } catch (err) {
            await transaction.rollback();
            this.logger.warn(
              `Failed to emit contract.expiring_soon event for contract ${(contract as any).id}`,
              err,
            );
          }
        }
      } catch (err) {
        this.logger.error(
          `Failed to check contract expiry alerts (${daysAhead} days) for tenant ${tenantId}`,
          err,
        );
      }
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Validates that the contract status transition is valid.
   * Valid transitions: Draft -> Active, Active -> Expired, Active -> Cancelled,
   * Draft -> Cancelled, Expired -> (no further transitions)
   */
  private _validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      [ContractStatus.DRAFT]: [ContractStatus.ACTIVE, ContractStatus.CANCELLED],
      [ContractStatus.ACTIVE]: [ContractStatus.EXPIRED, ContractStatus.CANCELLED],
      [ContractStatus.EXPIRED]: [],
      [ContractStatus.CANCELLED]: [],
    };

    const allowedNext = validTransitions[currentStatus];
    if (!allowedNext || !allowedNext.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid contract status transition from '${currentStatus}' to '${newStatus}'`,
      );
    }
  }
}
