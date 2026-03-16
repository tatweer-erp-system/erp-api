import { Injectable } from '@nestjs/common';
import { UnitsOfMeasureRepository } from '@/database/sql/repositories';
import { AdjustmentReasonsRepository } from '@/database/sql/repositories';
import { CreateUnitOfMeasureDto } from '../dto/create-unit-of-measure.dto';
import { UpdateUnitOfMeasureDto } from '../dto/update-unit-of-measure.dto';
import { CreateAdjustmentReasonDto } from '../dto/create-adjustment-reason.dto';
import { UpdateAdjustmentReasonDto } from '../dto/update-adjustment-reason.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { UomType } from '@/common/enums/definitions.enums';

@Injectable()
export class InventoryDefinitionsService {
  constructor(
    private readonly unitsOfMeasureRepository: UnitsOfMeasureRepository,
    private readonly adjustmentReasonsRepository: AdjustmentReasonsRepository,
  ) {}

  // ── Units of Measure ──────────────────────────────────────────────────────

  async findAllUnitsOfMeasure(tenantId: string, query: PaginationDto) {
    return this.unitsOfMeasureRepository.findAll({ ...query, tenantId });
  }

  async findUnitOfMeasureById(tenantId: string, id: string) {
    return this.unitsOfMeasureRepository.findById(id, { tenantId });
  }

  async createUnitOfMeasure(
    tenantId: string,
    dto: CreateUnitOfMeasureDto,
    auditContext: AuditContext,
  ) {
    return this.unitsOfMeasureRepository.create(
      {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        symbol: dto.symbol,
        uomType: dto.uomType ?? UomType.UNIT,
        isActive: dto.isActive ?? true,
      } as any,
      { tenantId, auditContext },
    );
  }

  async updateUnitOfMeasure(
    tenantId: string,
    id: string,
    dto: UpdateUnitOfMeasureDto,
    auditContext: AuditContext,
  ) {
    const { version, ...data } = dto;
    return this.unitsOfMeasureRepository.update(id, { ...data, version } as any, {
      tenantId,
      auditContext,
    });
  }

  async deleteUnitOfMeasure(tenantId: string, id: string, auditContext: AuditContext) {
    return this.unitsOfMeasureRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Adjustment Reasons ────────────────────────────────────────────────────

  async findAllAdjustmentReasons(tenantId: string, query: PaginationDto) {
    return this.adjustmentReasonsRepository.findAll({ ...query, tenantId });
  }

  async findAdjustmentReasonById(tenantId: string, id: string) {
    return this.adjustmentReasonsRepository.findById(id, { tenantId });
  }

  async createAdjustmentReason(
    tenantId: string,
    dto: CreateAdjustmentReasonDto,
    auditContext: AuditContext,
  ) {
    return this.adjustmentReasonsRepository.create(
      {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        type: dto.type,
        isActive: dto.isActive ?? true,
      } as any,
      { tenantId, auditContext },
    );
  }

  async updateAdjustmentReason(
    tenantId: string,
    id: string,
    dto: UpdateAdjustmentReasonDto,
    auditContext: AuditContext,
  ) {
    const { version, ...data } = dto;
    return this.adjustmentReasonsRepository.update(id, { ...data, version } as any, {
      tenantId,
      auditContext,
    });
  }

  async deleteAdjustmentReason(tenantId: string, id: string, auditContext: AuditContext) {
    return this.adjustmentReasonsRepository.softDelete(id, { tenantId, auditContext });
  }
}
