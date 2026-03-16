import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ManagerOverridesRepository } from '@/database/sql/repositories/manager-overrides.repository';
import { PosCashiersService } from './cashiers.service';
import { RequestOverrideDto } from '../dto/request-override.dto';
import { ApproveOverrideDto } from '../dto/approve-override.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { OverrideStatus } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class OverridesService {
  constructor(
    private readonly managerOverridesRepository: ManagerOverridesRepository,
    private readonly posCashiersService: PosCashiersService,
  ) {}

  async requestOverride(
    _tenantId: string,
    dto: RequestOverrideDto,
    auditContext: { userId?: string; tenantId?: string },
  ) {
    const requestedBy = auditContext.userId!;

    const details = {
      ...(dto.details ?? {}),
      status: OverrideStatus.PENDING,
    };

    return this.managerOverridesRepository.create({
      sessionId: dto.sessionId,
      orderId: dto.orderId ?? null,
      actionType: dto.actionType,
      requestedBy,
      approvedBy: requestedBy,
      details,
      notes: dto.notes ?? null,
      createdBy: requestedBy,
    });
  }

  async approveOverride(
    tenantId: string,
    overrideId: string,
    dto: ApproveOverrideDto,
    auditContext: { userId?: string; tenantId?: string },
  ) {
    const override = await this.managerOverridesRepository.findById(overrideId);

    const currentDetails = (override.details ?? {}) as Record<string, unknown>;
    if (currentDetails['status'] === OverrideStatus.APPROVED) {
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

    return this.managerOverridesRepository.update(overrideId, {
      approvedBy: dto.managerUserId,
      details: updatedDetails,
      notes: dto.notes !== undefined ? dto.notes : override.notes,
      updatedBy: auditContext.userId ?? null,
    });
  }

  async findAll(_tenantId: string, pagination: PaginationDto) {
    return this.managerOverridesRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
    });
  }

  async findById(_tenantId: string, id: string) {
    const override = await this.managerOverridesRepository.findByIdOrNull(id);

    if (!override) {
      throw new NotFoundException(msg(ErrorMessages.OVERRIDE_NOT_FOUND, id));
    }

    return override;
  }
}
