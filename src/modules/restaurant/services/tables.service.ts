import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { RestaurantTablesRepository } from '@/database/sql/repositories/restaurant-tables.repository';
import { TableSessionsRepository } from '@/database/sql/repositories/table-sessions.repository';
import { CreateTableDto } from '../dto/create-table.dto';
import { UpdateTableDto } from '../dto/update-table.dto';
import { TransferTableDto } from '../dto/transfer-table.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { TableStatus } from '@/common/enums/pos.enums';

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);

  constructor(
    private readonly tablesRepository: RestaurantTablesRepository,
    private readonly tableSessionsRepository: TableSessionsRepository,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const { page = 1, limit = 20, search, sortBy, sortOrder = 'DESC' } = query;
    return this.tablesRepository.findAll({
      tenantId,
      page,
      limit,
      search,
      searchFields: [],
      sortBy,
      sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    const table = await this.tablesRepository.findByIdOrNull(id, { tenantId });
    if (!table) {
      throw new NotFoundException(msg(ErrorMessages.TABLE_NOT_FOUND, id));
    }
    return table;
  }

  async create(tenantId: string, dto: CreateTableDto, auditContext: AuditContext) {
    // Enforce unique number within section
    const duplicate = await this.tablesRepository.findOne({
      tenantId,
      where: { sectionId: dto.sectionId, number: dto.number },
    });
    if (duplicate) {
      throw new BadRequestException(
        msg(ErrorMessages.TABLE_NUMBER_DUPLICATE, dto.number, dto.sectionId),
      );
    }

    return this.tablesRepository.create(
      {
        tenantId,
        sectionId: dto.sectionId,
        number: dto.number,
        capacity: dto.capacity ?? 4,
        minCapacity: dto.minCapacity ?? 1,
        status: dto.status ?? TableStatus.AVAILABLE,
        posX: dto.posX ?? 0,
        posY: dto.posY ?? 0,
        shape: dto.shape ?? 'square',
        width: dto.width ?? 80,
        height: dto.height ?? 80,
        isActive: dto.isActive ?? true,
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTableDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const existing = await this.tablesRepository.findByIdOrNull(id, { tenantId });
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.TABLE_NOT_FOUND, id));
    }

    const existingData = existing as unknown as Record<string, unknown>;

    // Check number uniqueness if changing number or sectionId
    const newNumber = dto.number !== undefined ? dto.number : String(existingData['number']);
    const newSectionId =
      dto.sectionId !== undefined ? dto.sectionId : String(existingData['sectionId']);

    if (dto.number !== undefined || dto.sectionId !== undefined) {
      const duplicate = await this.tablesRepository.findOne({
        tenantId,
        where: { sectionId: newSectionId, number: newNumber },
      });
      if (duplicate && (duplicate as any).id !== id) {
        throw new BadRequestException(
          msg(ErrorMessages.TABLE_NUMBER_DUPLICATE, newNumber, newSectionId),
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (dto.sectionId !== undefined) updates['sectionId'] = dto.sectionId;
    if (dto.number !== undefined) updates['number'] = dto.number;
    if (dto.capacity !== undefined) updates['capacity'] = dto.capacity;
    if (dto.minCapacity !== undefined) updates['minCapacity'] = dto.minCapacity;
    if (dto.status !== undefined) updates['status'] = dto.status;
    if (dto.posX !== undefined) updates['posX'] = dto.posX;
    if (dto.posY !== undefined) updates['posY'] = dto.posY;
    if (dto.shape !== undefined) updates['shape'] = dto.shape;
    if (dto.width !== undefined) updates['width'] = dto.width;
    if (dto.height !== undefined) updates['height'] = dto.height;
    if (dto.isActive !== undefined) updates['isActive'] = dto.isActive;

    return this.tablesRepository.update(id, updates as any, {
      tenantId,
      auditContext,
      transaction: containerTransaction,
    });
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.tablesRepository.findByIdOrNull(id, { tenantId });
    if (!existing) {
      throw new NotFoundException(msg(ErrorMessages.TABLE_NOT_FOUND, id));
    }
    await this.tablesRepository.softDelete(id, { tenantId, auditContext });
  }

  async transfer(
    tenantId: string,
    id: string,
    dto: TransferTableDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.tablesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // Load source table
      const sourceTable = await this.tablesRepository.findByIdOrNull(id, { tenantId, transaction });
      if (!sourceTable) {
        throw new NotFoundException(msg(ErrorMessages.TABLE_NOT_FOUND, id));
      }

      // Load destination table
      const destTable = await this.tablesRepository.findByIdOrNull(dto.toTableId, {
        tenantId,
        transaction,
      });
      if (!destTable) {
        throw new NotFoundException(msg(ErrorMessages.TABLE_NOT_FOUND, dto.toTableId));
      }

      // Find the active session on the source table
      const activeSession = await this.tableSessionsRepository.findOne({
        where: { tableId: id, releasedAt: null },
        transaction,
      });
      if (!activeSession) {
        throw new NotFoundException(msg(ErrorMessages.TABLE_SESSION_NOT_FOUND, id));
      }

      // Update session tableId to destination
      await this.tableSessionsRepository.update(
        (activeSession as any).id,
        { tableId: dto.toTableId } as any,
        { transaction },
      );

      // Source table → AVAILABLE (or CLEANING if cleaning needed; spec says AVAILABLE)
      await this.tablesRepository.update(id, { status: TableStatus.AVAILABLE } as any, {
        tenantId,
        auditContext,
        transaction,
      });

      // Destination table → OCCUPIED
      await this.tablesRepository.update(dto.toTableId, { status: TableStatus.OCCUPIED } as any, {
        tenantId,
        auditContext,
        transaction,
      });

      if (isOwner) await transaction.commit();

      return { success: true, sessionId: (activeSession as any).id };
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }
}
