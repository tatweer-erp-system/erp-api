import { Injectable, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { PaymentTermsRepository } from '@/database/sql/repositories/payment-terms.repository';
import { PaymentTermLinesRepository } from '@/database/sql/repositories/payment-term-lines.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { CreatePaymentTermDto, CreatePaymentTermLineDto } from '../dto/create-payment-term.dto';
import { UpdatePaymentTermDto } from '../dto/update-payment-term.dto';

@Injectable()
export class PaymentTermsService {
  constructor(
    private readonly paymentTermsRepository: PaymentTermsRepository,
    private readonly paymentTermLinesRepository: PaymentTermLinesRepository,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.paymentTermsRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['nameEn', 'nameAr'],
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'DESC',
    });
  }

  async findById(tenantId: string, id: string) {
    const term = await this.paymentTermsRepository.findById(id, { tenantId });
    const lines = await this.paymentTermLinesRepository.findByPaymentTermId(tenantId, id);
    return { ...(term as unknown as Record<string, unknown>), lines };
  }

  async create(tenantId: string, dto: CreatePaymentTermDto, auditContext: AuditContext) {
    const transaction = await this.paymentTermsRepository.createTransaction();

    try {
      const term = await this.paymentTermsRepository.create(
        {
          nameEn: dto.nameEn,
          nameAr: dto.nameAr,
          note: dto.note ?? null,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const termId = (term as unknown as Record<string, unknown>).id as string;
      let lines: unknown[] = [];

      if (dto.lines && dto.lines.length > 0) {
        lines = await this.createLines(tenantId, termId, dto.lines, auditContext, transaction);
      }

      await transaction.commit();
      return { ...(term as unknown as Record<string, unknown>), lines };
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePaymentTermDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.paymentTermsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) throw new NotFoundException(msg(ErrorMessages.PAYMENT_TERM_NOT_FOUND, id));

    const transaction = await this.paymentTermsRepository.createTransaction();

    try {
      const { version: _version, lines: linesDto, ...termData } = dto;

      const term = await this.paymentTermsRepository.update(id, termData as any, {
        tenantId,
        auditContext,
        transaction,
      });

      let lines: unknown[] = [];

      if (linesDto !== undefined) {
        // Delete existing lines and recreate
        await this.paymentTermLinesRepository.deleteByPaymentTermId(tenantId, id, transaction);

        if (linesDto.length > 0) {
          lines = await this.createLines(tenantId, id, linesDto, auditContext, transaction);
        }
      } else {
        lines = await this.paymentTermLinesRepository.findByPaymentTermId(
          tenantId,
          id,
          transaction,
        );
      }

      await transaction.commit();
      return { ...(term as unknown as Record<string, unknown>), lines };
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.paymentTermsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) throw new NotFoundException(msg(ErrorMessages.PAYMENT_TERM_NOT_FOUND, id));

    const transaction = await this.paymentTermsRepository.createTransaction();

    try {
      await this.paymentTermLinesRepository.deleteByPaymentTermId(tenantId, id, transaction);
      await this.paymentTermsRepository.softDelete(id, { tenantId, auditContext, transaction });
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  private async createLines(
    tenantId: string,
    paymentTermId: string,
    lines: CreatePaymentTermLineDto[],
    auditContext: AuditContext,
    transaction: Transaction,
  ): Promise<unknown[]> {
    const data = lines.map((line, index) => ({
      paymentTermId,
      sequence: line.sequence ?? index,
      type: line.type,
      value: line.value ?? 0,
      days: line.days ?? 0,
      dayOfMonth: line.dayOfMonth ?? null,
      tenantId,
      createdBy: auditContext.userId,
      updatedBy: auditContext.userId,
    }));

    return this.paymentTermLinesRepository.bulkCreate({
      data,
      tenantId,
      auditContext,
      transaction,
    });
  }
}
