import { Injectable } from '@nestjs/common';
import { VoucherTypesRepository } from '@/database/sql/repositories/voucher-types.repository';
import { ReceiptTemplatesRepository } from '@/database/sql/repositories/receipt-templates.repository';
import { CancellationReasonsRepository } from '@/database/sql/repositories/cancellation-reasons.repository';
import { VoidRefundReasonsRepository } from '@/database/sql/repositories/void-refund-reasons.repository';
import { DiscountReasonsRepository } from '@/database/sql/repositories/discount-reasons.repository';
import { HoldReasonsRepository } from '@/database/sql/repositories/hold-reasons.repository';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { CreateVoucherTypeDto } from '../dto/create-voucher-type.dto';
import { UpdateVoucherTypeDto } from '../dto/update-voucher-type.dto';
import { CreateReceiptTemplateDto } from '../dto/create-receipt-template.dto';
import { UpdateReceiptTemplateDto } from '../dto/update-receipt-template.dto';
import { CreateCancellationReasonDto } from '../dto/create-cancellation-reason.dto';
import { UpdateCancellationReasonDto } from '../dto/update-cancellation-reason.dto';
import { CreateVoidRefundReasonDto } from '../dto/create-void-refund-reason.dto';
import { UpdateVoidRefundReasonDto } from '../dto/update-void-refund-reason.dto';
import { CreateDiscountReasonDto } from '../dto/create-discount-reason.dto';
import { UpdateDiscountReasonDto } from '../dto/update-discount-reason.dto';
import { CreateHoldReasonDto } from '../dto/create-hold-reason.dto';
import { UpdateHoldReasonDto } from '../dto/update-hold-reason.dto';

@Injectable()
export class SalesDefinitionsService {
  constructor(
    private readonly voucherTypesRepository: VoucherTypesRepository,
    private readonly receiptTemplatesRepository: ReceiptTemplatesRepository,
    private readonly cancellationReasonsRepository: CancellationReasonsRepository,
    private readonly voidRefundReasonsRepository: VoidRefundReasonsRepository,
    private readonly discountReasonsRepository: DiscountReasonsRepository,
    private readonly holdReasonsRepository: HoldReasonsRepository,
  ) {}

  // ── Voucher Types ──────────────────────────────────────────────────────────

  findAllVoucherTypes(tenantId: string, query: PaginationDto) {
    return this.voucherTypesRepository.findAll({ ...query, tenantId });
  }

  findVoucherTypeById(tenantId: string, id: string) {
    return this.voucherTypesRepository.findById(id, { tenantId });
  }

  createVoucherType(tenantId: string, dto: CreateVoucherTypeDto, auditContext?: AuditContext) {
    return this.voucherTypesRepository.create({ ...dto } as any, { tenantId, auditContext });
  }

  updateVoucherType(
    tenantId: string,
    id: string,
    dto: UpdateVoucherTypeDto,
    auditContext?: AuditContext,
  ) {
    return this.voucherTypesRepository.update(id, { ...dto } as any, { tenantId, auditContext });
  }

  deleteVoucherType(tenantId: string, id: string, auditContext?: AuditContext) {
    return this.voucherTypesRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Receipt Templates ──────────────────────────────────────────────────────

  findAllReceiptTemplates(tenantId: string, query: PaginationDto) {
    return this.receiptTemplatesRepository.findAll({ ...query, tenantId });
  }

  findReceiptTemplateById(tenantId: string, id: string) {
    return this.receiptTemplatesRepository.findById(id, { tenantId });
  }

  createReceiptTemplate(
    tenantId: string,
    dto: CreateReceiptTemplateDto,
    auditContext?: AuditContext,
  ) {
    return this.receiptTemplatesRepository.create({ ...dto } as any, { tenantId, auditContext });
  }

  updateReceiptTemplate(
    tenantId: string,
    id: string,
    dto: UpdateReceiptTemplateDto,
    auditContext?: AuditContext,
  ) {
    return this.receiptTemplatesRepository.update(id, { ...dto } as any, {
      tenantId,
      auditContext,
    });
  }

  deleteReceiptTemplate(tenantId: string, id: string, auditContext?: AuditContext) {
    return this.receiptTemplatesRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Cancellation Reasons ───────────────────────────────────────────────────

  findAllCancellationReasons(tenantId: string, query: PaginationDto) {
    return this.cancellationReasonsRepository.findAll({ ...query, tenantId });
  }

  findCancellationReasonById(tenantId: string, id: string) {
    return this.cancellationReasonsRepository.findById(id, { tenantId });
  }

  createCancellationReason(
    tenantId: string,
    dto: CreateCancellationReasonDto,
    auditContext?: AuditContext,
  ) {
    return this.cancellationReasonsRepository.create({ ...dto } as any, {
      tenantId,
      auditContext,
    });
  }

  updateCancellationReason(
    tenantId: string,
    id: string,
    dto: UpdateCancellationReasonDto,
    auditContext?: AuditContext,
  ) {
    return this.cancellationReasonsRepository.update(id, { ...dto } as any, {
      tenantId,
      auditContext,
    });
  }

  deleteCancellationReason(tenantId: string, id: string, auditContext?: AuditContext) {
    return this.cancellationReasonsRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Void/Refund Reasons ────────────────────────────────────────────────────

  findAllVoidRefundReasons(tenantId: string, query: PaginationDto) {
    return this.voidRefundReasonsRepository.findAll({ ...query, tenantId });
  }

  findVoidRefundReasonById(tenantId: string, id: string) {
    return this.voidRefundReasonsRepository.findById(id, { tenantId });
  }

  createVoidRefundReason(
    tenantId: string,
    dto: CreateVoidRefundReasonDto,
    auditContext?: AuditContext,
  ) {
    return this.voidRefundReasonsRepository.create({ ...dto } as any, { tenantId, auditContext });
  }

  updateVoidRefundReason(
    tenantId: string,
    id: string,
    dto: UpdateVoidRefundReasonDto,
    auditContext?: AuditContext,
  ) {
    return this.voidRefundReasonsRepository.update(id, { ...dto } as any, {
      tenantId,
      auditContext,
    });
  }

  deleteVoidRefundReason(tenantId: string, id: string, auditContext?: AuditContext) {
    return this.voidRefundReasonsRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Discount Reasons ───────────────────────────────────────────────────────

  findAllDiscountReasons(tenantId: string, query: PaginationDto) {
    return this.discountReasonsRepository.findAll({ ...query, tenantId });
  }

  findDiscountReasonById(tenantId: string, id: string) {
    return this.discountReasonsRepository.findById(id, { tenantId });
  }

  createDiscountReason(
    tenantId: string,
    dto: CreateDiscountReasonDto,
    auditContext?: AuditContext,
  ) {
    return this.discountReasonsRepository.create({ ...dto } as any, { tenantId, auditContext });
  }

  updateDiscountReason(
    tenantId: string,
    id: string,
    dto: UpdateDiscountReasonDto,
    auditContext?: AuditContext,
  ) {
    return this.discountReasonsRepository.update(id, { ...dto } as any, {
      tenantId,
      auditContext,
    });
  }

  deleteDiscountReason(tenantId: string, id: string, auditContext?: AuditContext) {
    return this.discountReasonsRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Hold Reasons ───────────────────────────────────────────────────────────

  findAllHoldReasons(tenantId: string, query: PaginationDto) {
    return this.holdReasonsRepository.findAll({ ...query, tenantId });
  }

  findHoldReasonById(tenantId: string, id: string) {
    return this.holdReasonsRepository.findById(id, { tenantId });
  }

  createHoldReason(tenantId: string, dto: CreateHoldReasonDto, auditContext?: AuditContext) {
    return this.holdReasonsRepository.create({ ...dto } as any, { tenantId, auditContext });
  }

  updateHoldReason(
    tenantId: string,
    id: string,
    dto: UpdateHoldReasonDto,
    auditContext?: AuditContext,
  ) {
    return this.holdReasonsRepository.update(id, { ...dto } as any, { tenantId, auditContext });
  }

  deleteHoldReason(tenantId: string, id: string, auditContext?: AuditContext) {
    return this.holdReasonsRepository.softDelete(id, { tenantId, auditContext });
  }
}
