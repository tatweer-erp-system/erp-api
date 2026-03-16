import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentTermsRepository } from '@/database/sql/repositories/payment-terms.repository';
import { RejectionReasonsRepository } from '@/database/sql/repositories/rejection-reasons.repository';
import { CreatePaymentTermDto } from '../dto/create-payment-term.dto';
import { UpdatePaymentTermDto } from '../dto/update-payment-term.dto';
import { CreateRejectionReasonDto } from '../dto/create-rejection-reason.dto';
import { UpdateRejectionReasonDto } from '../dto/update-rejection-reason.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

@Injectable()
export class PurchasingDefinitionsService {
  constructor(
    private readonly paymentTermsRepository: PaymentTermsRepository,
    private readonly rejectionReasonsRepository: RejectionReasonsRepository,
  ) {}

  // ─── Payment Terms ────────────────────────────────────────────────────

  async findAllPaymentTerms(tenantId: string, pagination: PaginationDto) {
    return this.paymentTermsRepository.findAll({
      tenantId,
      page: pagination.page,
      limit: pagination.limit,
      search: pagination.search,
      searchFields: ['nameEn', 'nameAr'],
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });
  }

  async findPaymentTermById(tenantId: string, id: string) {
    const record = await this.paymentTermsRepository.findByIdOrNull(id, { tenantId });
    if (!record) {
      throw new BadRequestException(msg(ErrorMessages.PAYMENT_TERM_NOT_FOUND, id));
    }
    return record;
  }

  async createPaymentTerm(tenantId: string, dto: CreatePaymentTermDto, auditContext: AuditContext) {
    return this.paymentTermsRepository.create(
      {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        descriptionEn: dto.descriptionEn ?? null,
        descriptionAr: dto.descriptionAr ?? null,
        daysDue: dto.daysDue,
        penaltyPercentage: dto.penaltyPercentage ?? null,
        isActive: dto.isActive ?? true,
      } as any,
      { tenantId, auditContext },
    );
  }

  async updatePaymentTerm(
    tenantId: string,
    id: string,
    dto: UpdatePaymentTermDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.paymentTermsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) {
      throw new BadRequestException(msg(ErrorMessages.PAYMENT_TERM_NOT_FOUND, id));
    }

    return this.paymentTermsRepository.update(id, dto as any, { tenantId, auditContext });
  }

  async removePaymentTerm(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.paymentTermsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) {
      throw new BadRequestException(msg(ErrorMessages.PAYMENT_TERM_NOT_FOUND, id));
    }

    await this.paymentTermsRepository.softDelete(id, { tenantId, auditContext });
  }

  // ─── Rejection Reasons ────────────────────────────────────────────────

  async findAllRejectionReasons(tenantId: string, pagination: PaginationDto) {
    return this.rejectionReasonsRepository.findAll({
      tenantId,
      page: pagination.page,
      limit: pagination.limit,
      search: pagination.search,
      searchFields: ['nameEn', 'nameAr'],
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });
  }

  async findRejectionReasonById(tenantId: string, id: string) {
    const record = await this.rejectionReasonsRepository.findByIdOrNull(id, { tenantId });
    if (!record) {
      throw new BadRequestException(msg(ErrorMessages.REJECTION_REASON_NOT_FOUND, id));
    }
    return record;
  }

  async createRejectionReason(
    tenantId: string,
    dto: CreateRejectionReasonDto,
    auditContext: AuditContext,
  ) {
    return this.rejectionReasonsRepository.create(
      {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        isActive: dto.isActive ?? true,
      } as any,
      { tenantId, auditContext },
    );
  }

  async updateRejectionReason(
    tenantId: string,
    id: string,
    dto: UpdateRejectionReasonDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.rejectionReasonsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) {
      throw new BadRequestException(msg(ErrorMessages.REJECTION_REASON_NOT_FOUND, id));
    }

    return this.rejectionReasonsRepository.update(id, dto as any, { tenantId, auditContext });
  }

  async removeRejectionReason(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.rejectionReasonsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) {
      throw new BadRequestException(msg(ErrorMessages.REJECTION_REASON_NOT_FOUND, id));
    }

    await this.rejectionReasonsRepository.softDelete(id, { tenantId, auditContext });
  }
}
