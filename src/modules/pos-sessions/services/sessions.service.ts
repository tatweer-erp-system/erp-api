import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PosSessionsRepository } from '@/database/sql/repositories/pos-sessions.repository';
import { TerminalsService } from './terminals.service';
import { OpenSessionDto } from '../dto/open-session.dto';
import { CloseSessionDto } from '../dto/close-session.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { PosSessionStatus } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class PosSessionsService {
  constructor(
    private readonly posSessionsRepository: PosSessionsRepository,
    private readonly terminalsService: TerminalsService,
  ) {}

  async findAll(branchId: string, pagination: PaginationDto) {
    return this.posSessionsRepository.findAll({
      branchId,
      page: pagination.page,
      limit: pagination.limit,
    });
  }

  /** @deprecated accepts tenantId as first arg for backward compat — treated as branchId */
  async findById(_tenantId: string, id: string) {
    return this.posSessionsRepository.findById(id);
  }

  async openSession(
    _tenantId: string,
    dto: OpenSessionDto,
    auditContext: { userId?: string; tenantId?: string },
  ) {
    const cashierId = auditContext.userId!;

    // Rule: one cashier can only have ONE open session at a time
    const existingSession = await this.posSessionsRepository.findOne({
      cashierId,
      status: PosSessionStatus.OPEN,
    });
    if (existingSession) {
      throw new ConflictException(
        msg(ErrorMessages.SESSION_ALREADY_OPEN, String(existingSession.id)),
      );
    }

    // Validate terminal exists and is active
    const terminal = await this.terminalsService.findActiveById(_tenantId, dto.terminalId);

    return this.posSessionsRepository.create({
      branchId: terminal.branchId,
      cashierId,
      terminalId: dto.terminalId,
      status: PosSessionStatus.OPEN,
      openingBalance: dto.openingFloat ?? 0,
      openingFloat: dto.openingFloat ?? 0,
      openedAt: new Date(),
      notes: dto.notes ?? null,
      createdBy: auditContext.userId ?? null,
    });
  }

  async closeSession(
    _tenantId: string,
    sessionId: string,
    dto: CloseSessionDto,
    auditContext: { userId?: string; tenantId?: string },
  ) {
    const session = await this.posSessionsRepository.findById(sessionId);

    if (session.status !== PosSessionStatus.OPEN) {
      throw new BadRequestException(msg(ErrorMessages.SESSION_CLOSED));
    }

    const openingFloat = parseFloat(String(session.openingFloat ?? session.openingBalance ?? 0));
    const closingFloat = dto.closingFloat;

    // Without a cash movements entity we cannot compute movements sum here.
    // expectedFloat falls back to openingFloat (no movements tracked yet).
    const expectedFloat = openingFloat;
    const floatDifference = closingFloat - expectedFloat;

    return this.posSessionsRepository.update(sessionId, {
      status: PosSessionStatus.CLOSED,
      closingBalance: closingFloat,
      closingFloat,
      expectedBalance: expectedFloat,
      expectedFloat,
      floatDifference,
      closedAt: new Date(),
      notes: dto.notes !== undefined ? dto.notes : (session.notes ?? null),
      updatedBy: auditContext.userId ?? null,
    });
  }

  async getCurrentSession(_tenantId: string, cashierId: string) {
    const session = await this.posSessionsRepository.findOne({
      cashierId,
      status: PosSessionStatus.OPEN,
    });

    if (!session) {
      throw new NotFoundException('No open session found for the current user');
    }

    const openingFloat = parseFloat(String(session.openingFloat ?? session.openingBalance ?? 0));

    return {
      ...session,
      cash_movements_summary: {
        total_in: 0,
        total_out: 0,
        count: 0,
        expected_float: openingFloat,
      },
    };
  }

  // ── Backward-compat alias used by some callers ────────────────────────────
  async getOpenSession(cashierId: string, branchId: string) {
    return this.posSessionsRepository.findOpen(cashierId, branchId);
  }
}
