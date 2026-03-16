import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { RestaurantTablesRepository } from '@/database/sql/repositories/restaurant-tables.repository';
import { TableSessionsRepository } from '@/database/sql/repositories/table-sessions.repository';
import { CreateTableDto } from '../dto/create-table.dto';
import { UpdateTableDto } from '../dto/update-table.dto';
import { TransferTableDto } from '../dto/transfer-table.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { TableStatus } from '@/common/enums/restaurant.enums';

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);

  constructor(
    private readonly tablesRepository: RestaurantTablesRepository,
    private readonly tableSessionsRepository: TableSessionsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findAll(branchId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    return this.tablesRepository.findAll(branchId, undefined, undefined, page, limit);
  }

  async findById(branchId: string, id: string) {
    const table = await this.tablesRepository.findByIdOrNull(id);
    if (!table) {
      throw new NotFoundException(msg(ErrorMessages.TABLE_NOT_FOUND, id));
    }
    return table;
  }

  async create(branchId: string, dto: CreateTableDto, _auditContext: AuditContext) {
    // Enforce unique number within section
    const duplicate = await this.tablesRepository.findOne({
      where: { sectionId: (dto as any).sectionId, number: (dto as any).number },
    });
    if (duplicate) {
      throw new BadRequestException(
        msg(ErrorMessages.TABLE_NUMBER_DUPLICATE, (dto as any).number, (dto as any).sectionId),
      );
    }

    return this.tablesRepository.create({
      branchId,
      sectionId: (dto as any).sectionId,
      number: (dto as any).number,
      capacity: (dto as any).capacity ?? 4,
      status: (dto as any).status ?? TableStatus.AVAILABLE,
      isActive: (dto as any).isActive ?? true,
    });
  }

  async update(
    branchId: string,
    id: string,
    dto: UpdateTableDto,
    _auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    const existing = await this.tablesRepository.findByIdOrNull(id);
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.TABLE_NOT_FOUND, id));
    }

    // Check number uniqueness if changing number or sectionId
    const newNumber = (dto as any).number !== undefined ? (dto as any).number : existing.number;
    const newSectionId =
      (dto as any).sectionId !== undefined ? (dto as any).sectionId : existing.sectionId;

    if ((dto as any).number !== undefined || (dto as any).sectionId !== undefined) {
      const duplicate = await this.tablesRepository.findOne({
        where: { sectionId: newSectionId, number: newNumber },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          msg(ErrorMessages.TABLE_NUMBER_DUPLICATE, newNumber, newSectionId),
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if ((dto as any).sectionId !== undefined) updates.sectionId = (dto as any).sectionId;
    if ((dto as any).number !== undefined) updates.number = (dto as any).number;
    if ((dto as any).capacity !== undefined) updates.capacity = (dto as any).capacity;
    if ((dto as any).status !== undefined) updates.status = (dto as any).status;
    if ((dto as any).isActive !== undefined) updates.isActive = (dto as any).isActive;

    return this.tablesRepository.update(id, updates as any);
  }

  async remove(branchId: string, id: string, _auditContext: AuditContext) {
    const existing = await this.tablesRepository.findByIdOrNull(id);
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.TABLE_NOT_FOUND, id));
    }
    await this.tablesRepository.softDelete(id);
  }

  async transfer(
    branchId: string,
    id: string,
    dto: TransferTableDto,
    _auditContext: AuditContext,
    _containerTransaction?: unknown,
  ) {
    return this.dataSource.transaction(async (manager) => {
      // Load source table
      const sourceTable = await this.tablesRepository.findByIdOrNull(id);
      if (!sourceTable) {
        throw new NotFoundException(msg(ErrorMessages.TABLE_NOT_FOUND, id));
      }

      // Load destination table
      const destTable = await this.tablesRepository.findByIdOrNull((dto as any).toTableId);
      if (!destTable) {
        throw new NotFoundException(msg(ErrorMessages.TABLE_NOT_FOUND, (dto as any).toTableId));
      }

      // Reject transfer if destination table is occupied
      if (destTable.status === TableStatus.OCCUPIED) {
        throw new ConflictException(msg(ErrorMessages.TABLE_OCCUPIED, destTable.number));
      }

      // Find the active session on the source table
      const activeSession = await this.tableSessionsRepository.findActiveByTable(id);
      if (!activeSession) {
        throw new NotFoundException(msg(ErrorMessages.TABLE_SESSION_NOT_FOUND, id));
      }

      // Update session tableId to destination
      await this.tableSessionsRepository.update(activeSession.id, {
        tableId: (dto as any).toTableId,
      });

      // Source table → AVAILABLE
      await this.tablesRepository.updateStatus(id, TableStatus.AVAILABLE);

      // Destination table → OCCUPIED
      await this.tablesRepository.updateStatus((dto as any).toTableId, TableStatus.OCCUPIED);

      return { success: true, sessionId: activeSession.id };
    });
  }
}
