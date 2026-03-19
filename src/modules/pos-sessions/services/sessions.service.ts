import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transaction } from 'sequelize';
import { PosSessionsRepository } from '@/database/sql/repositories/pos-sessions.repository';
import { CashMovementsRepository } from '@/database/sql/repositories/cash-movements.repository';
import { TerminalsService } from './terminals.service';
import { OpenSessionDto } from '../dto/open-session.dto';
import { CloseSessionDto } from '../dto/close-session.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PosSessionStatus, CashMovementType } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

interface CashMovementSummary {
  totalCashIn: string;
  totalCashOut: string;
}

@Injectable()
export class PosSessionsService {
  constructor(
    private readonly posSessionsRepository: PosSessionsRepository,
    private readonly cashMovementsRepository: CashMovementsRepository,
    private readonly terminalsService: TerminalsService,
  ) {}

  async findAll(tenantId: string, pagination: PaginationDto) {
    return this.posSessionsRepository.findAll({
      tenantId,
      page: pagination.page,
      limit: pagination.limit,
      search: pagination.search,
      searchFields: ['status'],
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    return this.posSessionsRepository.findById(id, { tenantId });
  }

  async openSession(tenantId: string, dto: OpenSessionDto, auditContext: AuditContext) {
    const cashierId = auditContext.userId!;

    // Check if cashier already has an open session
    const existingSession = await this.posSessionsRepository.findOne({
      tenantId,
      where: { cashierId: cashierId, status: PosSessionStatus.OPEN },
    });
    if (existingSession) {
      throw new ConflictException(
        msg(ErrorMessages.SESSION_ALREADY_OPEN, String((existingSession as any).id)),
      );
    }

    // Validate terminal exists and is active
    const terminal = await this.terminalsService.findActiveById(tenantId, dto.terminalId);

    return this.posSessionsRepository.create(
      {
        branchId: terminal.branchId,
        cashierId,
        terminalId: dto.terminalId,
        status: PosSessionStatus.OPEN,
        openingFloat: dto.openingFloat,
        openedAt: new Date(),
        notes: dto.notes ?? null,
      } as any,
      { tenantId, auditContext },
    );
  }

  async closeSession(
    tenantId: string,
    sessionId: string,
    dto: CloseSessionDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.posSessionsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // Fetch session within transaction lock
      const session = await this.posSessionsRepository.findById(sessionId, {
        tenantId,
        transaction,
      });

      if (session.status !== PosSessionStatus.OPEN) {
        throw new BadRequestException(msg(ErrorMessages.SESSION_CLOSED));
      }

      // Get cash movements summary
      // SQL strings correspond to CashMovementType.CASH_IN / CashMovementType.CASH_OUT
      const [summary] = await this.cashMovementsRepository.rawQuery<CashMovementSummary[]>(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'cash_in' THEN amount ELSE 0 END), 0) as "totalCashIn",
          COALESCE(SUM(CASE WHEN type = 'cash_out' THEN amount ELSE 0 END), 0) as "totalCashOut"
        FROM cash_movements
        WHERE "sessionId" = :sessionId
          AND "tenantId" = :tenantId
          AND "deletedAt" IS NULL`,
        { sessionId, tenantId },
        transaction,
      );

      const totalCashIn = parseFloat(summary.totalCashIn) || 0;
      const totalCashOut = parseFloat(summary.totalCashOut) || 0;
      const openingFloat = parseFloat(String(session.openingFloat)) || 0;
      const closingFloat = dto.closingFloat;

      const expectedFloat = openingFloat + totalCashIn - totalCashOut;
      const floatDifference = closingFloat - expectedFloat;

      const updatedSession = await this.posSessionsRepository.update(
        sessionId,
        {
          status: PosSessionStatus.CLOSED,
          closingFloat,
          expectedFloat,
          floatDifference,
          closedAt: new Date(),
          notes: dto.notes !== undefined ? dto.notes : session.notes,
        } as any,
        { tenantId, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();
      return updatedSession;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async getCurrentSession(tenantId: string, cashierId: string) {
    const session = await this.posSessionsRepository.findOne({
      tenantId,
      where: { cashierId: cashierId, status: PosSessionStatus.OPEN },
    });

    if (!session) {
      throw new NotFoundException(msg(ErrorMessages.SESSION_NOT_OPEN));
    }

    // Get cash movements summary
    // SQL strings correspond to CashMovementType.CASH_IN / CashMovementType.CASH_OUT
    const [summary] = await this.cashMovementsRepository.rawQuery<
      { totalIn: string; totalOut: string; count: string }[]
    >(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'cash_in' THEN amount ELSE 0 END), 0) as "totalIn",
        COALESCE(SUM(CASE WHEN type = 'cash_out' THEN amount ELSE 0 END), 0) as "totalOut",
        COUNT(*)::text as count
      FROM cash_movements
      WHERE "sessionId" = :sessionId
        AND "tenantId" = :tenantId
        AND "deletedAt" IS NULL`,
      { sessionId: session.id, tenantId },
    );

    const totalIn = parseFloat(summary.totalIn) || 0;
    const totalOut = parseFloat(summary.totalOut) || 0;
    const openingFloat = parseFloat(String(session.openingFloat)) || 0;

    return {
      ...session,
      cash_movements_summary: {
        total_in: totalIn,
        total_out: totalOut,
        count: parseInt(summary.count, 10),
        expected_float: openingFloat + totalIn - totalOut,
      },
    };
  }
}
