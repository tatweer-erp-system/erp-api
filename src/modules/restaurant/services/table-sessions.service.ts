import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { TableSessionsRepository } from '@/database/sql/repositories/table-sessions.repository';
import { RestaurantTablesRepository } from '@/database/sql/repositories/restaurant-tables.repository';
import { PosOrdersRepository } from '@/database/sql/repositories/pos-orders.repository';
import { CreateTableSessionDto } from '../dto/create-table-session.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { TableStatus } from '@/common/enums/pos.enums';

@Injectable()
export class TableSessionsService {
  private readonly logger = new Logger(TableSessionsService.name);

  constructor(
    private readonly tableSessionsRepository: TableSessionsRepository,
    private readonly tablesRepository: RestaurantTablesRepository,
    private readonly ordersRepository: PosOrdersRepository,
  ) {}

  async findAll(query: PaginationDto) {
    const { page = 1, limit = 20, sortOrder = 'DESC' } = query;
    return this.tableSessionsRepository.findAll({
      bypassTenantScope: true,
      page,
      limit,
      sortOrder,
    });
  }

  async findById(id: string) {
    const session = await this.tableSessionsRepository.findByIdOrNull(id, {
      bypassTenantScope: true,
    });
    if (!session) {
      throw new NotFoundException(msg(ErrorMessages.TABLE_SESSION_NOT_FOUND, id));
    }
    return session;
  }

  async seat(
    tenantId: string,
    dto: CreateTableSessionDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.tableSessionsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // Validate table exists and belongs to tenant
      const table = await this.tablesRepository.findByIdOrNull(dto.tableId, {
        tenantId,
        transaction,
      });
      if (!table) {
        throw new NotFoundException(msg(ErrorMessages.TABLE_NOT_FOUND, dto.tableId));
      }

      // Check no active session already exists (one active session per table)
      const existingSession = await this.tableSessionsRepository.findOne({
        where: { tableId: dto.tableId, releasedAt: null },
        transaction,
      });
      if (existingSession) {
        throw new BadRequestException(msg(ErrorMessages.TABLE_OCCUPIED, dto.tableId));
      }

      // Create session with seatedAt = NOW()
      const session = await this.tableSessionsRepository.create(
        {
          tableId: dto.tableId,
          orderId: dto.orderId,
          guestCount: dto.guestCount ?? 1,
          seatedAt: new Date(),
          releasedAt: null,
          totalRevenue: 0,
        } as any,
        { transaction },
      );

      // Update table status to OCCUPIED
      await this.tablesRepository.update(dto.tableId, { status: TableStatus.OCCUPIED } as any, {
        tenantId,
        auditContext,
        transaction,
      });

      if (isOwner) await transaction.commit();
      return session;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async release(
    tenantId: string,
    id: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.tableSessionsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const session = await this.tableSessionsRepository.findByIdOrNull(id, {
        bypassTenantScope: true,
        transaction,
      });
      if (!session) {
        throw new NotFoundException(msg(ErrorMessages.TABLE_SESSION_NOT_FOUND, id));
      }

      const sessionData = session as unknown as Record<string, unknown>;

      // Check not already released
      if (sessionData['releasedAt'] !== null && sessionData['releasedAt'] !== undefined) {
        throw new BadRequestException(msg(ErrorMessages.TABLE_SESSION_ALREADY_RELEASED, id));
      }

      // Load order to get totalAmount for totalRevenue
      let totalRevenue = 0;
      const orderId = sessionData['orderId'] as string;
      if (orderId) {
        const order = await this.ordersRepository.findByIdOrNull(orderId, {
          bypassTenantScope: true,
          transaction,
        });
        if (order) {
          totalRevenue = parseFloat(String((order as any).totalAmount ?? 0));
        }
      }

      // Release session
      await this.tableSessionsRepository.update(
        id,
        {
          releasedAt: new Date(),
          totalRevenue,
        } as any,
        { transaction },
      );

      // Update table status to CLEANING
      const tableId = sessionData['tableId'] as string;
      await this.tablesRepository.update(tableId, { status: TableStatus.CLEANING } as any, {
        tenantId,
        auditContext,
        transaction,
      });

      if (isOwner) await transaction.commit();
      return { success: true, sessionId: id };
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }
}
