import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { TableSessionsRepository } from '@/database/sql/repositories/table-sessions.repository';
import { RestaurantTablesRepository } from '@/database/sql/repositories/restaurant-tables.repository';
import { CreateTableSessionDto } from '../dto/create-table-session.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { TableStatus } from '@/common/enums/restaurant.enums';

@Injectable()
export class TableSessionsService {
  private readonly logger = new Logger(TableSessionsService.name);

  constructor(
    private readonly tableSessionsRepository: TableSessionsRepository,
    private readonly tablesRepository: RestaurantTablesRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findAll(branchId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    return this.tableSessionsRepository.findAll(branchId, page, limit);
  }

  async findById(id: string) {
    const session = await this.tableSessionsRepository.findByIdOrNull(id);
    if (!session) {
      throw new NotFoundException(msg(ErrorMessages.TABLE_SESSION_NOT_FOUND, id));
    }
    return session;
  }

  async seat(
    branchId: string,
    dto: CreateTableSessionDto,
    _auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    return this.dataSource.transaction(async (_manager) => {
      // Validate table exists
      const table = await this.tablesRepository.findByIdOrNull((dto as any).tableId);
      if (!table) {
        throw new NotFoundException(msg(ErrorMessages.TABLE_NOT_FOUND, (dto as any).tableId));
      }

      // Check no active session already exists (one active session per table)
      const existingSession = await this.tableSessionsRepository.findActiveByTable(
        (dto as any).tableId,
      );
      if (existingSession) {
        throw new BadRequestException(msg(ErrorMessages.TABLE_OCCUPIED, (dto as any).tableId));
      }

      // Create session
      const session = await this.tableSessionsRepository.create({
        branchId,
        tableId: (dto as any).tableId,
        orderId: (dto as any).orderId ?? null,
        waiterId: (dto as any).waiterId ?? null,
        covers: (dto as any).guestCount ?? (dto as any).covers ?? 1,
        openedAt: new Date(),
        closedAt: null,
        isActive: true,
      });

      // Update table status to OCCUPIED
      await this.tablesRepository.updateStatus((dto as any).tableId, TableStatus.OCCUPIED);

      return session;
    });
  }

  async release(
    branchId: string,
    id: string,
    _auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    return this.dataSource.transaction(async (_manager) => {
      const session = await this.tableSessionsRepository.findByIdOrNull(id);
      if (!session) {
        throw new NotFoundException(msg(ErrorMessages.TABLE_SESSION_NOT_FOUND, id));
      }

      // Check not already released
      if (!session.isActive) {
        throw new BadRequestException(msg(ErrorMessages.TABLE_SESSION_ALREADY_RELEASED, id));
      }

      // Release session
      await this.tableSessionsRepository.update(id, {
        closedAt: new Date(),
        isActive: false,
      });

      // Update table status to CLEANING
      await this.tablesRepository.updateStatus(session.tableId, TableStatus.CLEANING);

      return { success: true, sessionId: id };
    });
  }
}
