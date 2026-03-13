import { BadRequestException, Injectable } from '@nestjs/common';
import { CashMovementsRepository } from '@/database/sql/repositories/cash-movements.repository';
import { PosSessionsRepository } from '@/database/sql/repositories/pos-sessions.repository';
import { CreateCashMovementDto } from '../dto/create-cash-movement.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PosSessionStatus } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class CashMovementsService {
  constructor(
    private readonly cashMovementsRepository: CashMovementsRepository,
    private readonly sessionsRepository: PosSessionsRepository,
  ) {}

  async create(tenantId: string, dto: CreateCashMovementDto, auditContext: AuditContext) {
    const session = await this.sessionsRepository.findOne({
      where: { cashierId: auditContext.userId, status: PosSessionStatus.OPEN },
      tenantId,
    });
    if (!session) {
      throw new BadRequestException(msg(ErrorMessages.SESSION_NOT_OPEN));
    }

    const sessionData = session as unknown as Record<string, unknown>;

    const movement = await this.cashMovementsRepository.create(
      {
        sessionId: sessionData.id,
        type: dto.type,
        amount: dto.amount,
        reason: dto.reason,
        notes: dto.notes ?? null,
        cashierId: auditContext.userId,
      } as any,
      { tenantId, auditContext },
    );

    return movement;
  }

  async findAll(tenantId: string, pagination: PaginationDto, userId: string) {
    const session = await this.sessionsRepository.findOne({
      where: { cashierId: userId, status: PosSessionStatus.OPEN },
      tenantId,
    });

    if (!session) {
      return {
        data: [],
        meta: { page: 1, limit: pagination.limit ?? 20, total: 0, totalPages: 0 },
      };
    }

    const sessionData = session as unknown as Record<string, unknown>;

    return this.cashMovementsRepository.findAll({
      tenantId,
      where: { sessionId: sessionData.id },
      page: pagination.page,
      limit: pagination.limit,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });
  }

  async voidMovement(tenantId: string, id: string, auditContext: AuditContext) {
    await this.cashMovementsRepository.softDelete(id, { tenantId, auditContext });
  }
}
