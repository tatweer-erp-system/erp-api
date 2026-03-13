import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ManagerOverridesRepository } from '@/database/sql/repositories/manager-overrides.repository';
import { PosCashiersService } from './cashiers.service';
import { RequestOverrideDto } from '../dto/request-override.dto';
import { ApproveOverrideDto } from '../dto/approve-override.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { OverrideStatus } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class OverridesService {
  constructor(
    private readonly managerOverridesRepository: ManagerOverridesRepository,
    private readonly posCashiersService: PosCashiersService,
  ) {}

  async requestOverride(tenantId: string, dto: RequestOverrideDto, auditContext: AuditContext) {
    const requestedBy = auditContext.userId!;

    const details = {
      ...(dto.details ?? {}),
      status: OverrideStatus.PENDING,
    };

    const override = await this.managerOverridesRepository.create(
      {
        sessionId: dto.sessionId,
        orderId: dto.orderId ?? null,
        actionType: dto.actionType,
        requestedBy,
        approvedBy: requestedBy,
        details,
        notes: dto.notes ?? null,
      } as any,
      { tenantId, auditContext },
    );

    return override;
  }

  async approveOverride(
    tenantId: string,
    overrideId: string,
    dto: ApproveOverrideDto,
    auditContext: AuditContext,
  ) {
    const override = await this.managerOverridesRepository.findById(overrideId, { tenantId });

    const currentDetails = (override.details ?? {}) as Record<string, unknown>;
    if (currentDetails.status === OverrideStatus.APPROVED) {
      throw new BadRequestException(msg(ErrorMessages.OVERRIDE_ALREADY_APPROVED));
    }

    // Authenticate the manager via PIN
    await this.posCashiersService.authenticateManagerPin(
      tenantId,
      dto.managerUserId,
      dto.managerPin,
    );

    const updatedDetails = {
      ...currentDetails,
      status: OverrideStatus.APPROVED,
    };

    const updatedOverride = await this.managerOverridesRepository.update(
      overrideId,
      {
        approvedBy: dto.managerUserId,
        details: updatedDetails,
        notes: dto.notes !== undefined ? dto.notes : override.notes,
      } as any,
      { tenantId, auditContext },
    );

    return updatedOverride;
  }

  async findAll(tenantId: string, pagination: PaginationDto) {
    return this.managerOverridesRepository.findAll({
      tenantId,
      page: pagination.page,
      limit: pagination.limit,
      search: pagination.search,
      searchFields: ['actionType'],
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    const override = await this.managerOverridesRepository.findByIdOrNull(id, { tenantId });

    if (!override) {
      throw new NotFoundException(msg(ErrorMessages.OVERRIDE_NOT_FOUND, id));
    }

    return override;
  }
}
