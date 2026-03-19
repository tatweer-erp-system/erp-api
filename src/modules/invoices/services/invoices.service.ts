import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Transaction, Op } from 'sequelize';
import { InvoicesRepository } from '@/database/sql/repositories/invoices.repository';
import { InvoiceLinesRepository } from '@/database/sql/repositories/invoice-lines.repository';
import { InvoiceLineTaxesRepository } from '@/database/sql/repositories/invoice-line-taxes.repository';
import { PaymentsNewRepository } from '@/database/sql/repositories/payments-new.repository';
import { InvoicePaymentsRepository } from '@/database/sql/repositories/invoice-payments.repository';
import { PartnersRepository } from '@/database/sql/repositories/partners.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import {
  InvoiceStatusNew,
  InvoicePaymentStatus,
  PaymentTypeNew,
  PaymentStatusNew,
  InvoiceTypeNew,
} from '@/common/enums/invoice.enums';
import { SequenceEntity } from '@/common/enums/sequence.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { StatusTransitionSharedService } from '@/shared/services/status-transition-shared.service';
import { JournalPosterSharedService } from '@/shared/services/journal-poster-shared.service';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { TaxSharedService } from '@/shared/services/tax-shared.service';
import { UnifiedSettingsService } from '@/modules/settings/services/unified-settings.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { FilterInvoiceDto } from '../dto/filter-invoice.dto';
import { RegisterPaymentDto } from '../dto/register-payment.dto';
import { CreateInvoiceLineDto } from '../dto/create-invoice-line.dto';

const INVOICE_TRANSITION_ENTITY = 'invoice_new';
const PAYMENT_SEQUENCE_ENTITY = 'payment';
const INVOICE_SEQUENCE_ENTITY = 'invoice';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly invoiceLinesRepository: InvoiceLinesRepository,
    private readonly invoiceLineTaxesRepository: InvoiceLineTaxesRepository,
    private readonly paymentsNewRepository: PaymentsNewRepository,
    private readonly invoicePaymentsRepository: InvoicePaymentsRepository,
    private readonly partnersRepository: PartnersRepository,
    private readonly sequencesService: SequencesService,
    private readonly statusTransitionService: StatusTransitionSharedService,
    private readonly journalPosterService: JournalPosterSharedService,
    private readonly auditService: AuditSharedService,
    private readonly taxSharedService: TaxSharedService,
    private readonly unifiedSettings: UnifiedSettingsService,
  ) {
    // Register status transitions for the new invoice entity
    this.statusTransitionService.registerTransitions(INVOICE_TRANSITION_ENTITY, [
      { from: InvoiceStatusNew.DRAFT, to: InvoiceStatusNew.POSTED },
      { from: InvoiceStatusNew.DRAFT, to: InvoiceStatusNew.CANCELLED },
      { from: InvoiceStatusNew.POSTED, to: InvoiceStatusNew.CANCELLED },
    ]);
  }

  // ── List ─────────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, query: FilterInvoiceDto) {
    const where: Record<string, unknown> = {};

    if (query.invoiceType) where.invoiceType = query.invoiceType;
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.partnerId) where.partnerId = query.partnerId;
    if (query.branchId) where.branchId = query.branchId;

    if (query.dateFrom || query.dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (query.dateFrom) dateFilter[Op.gte as unknown as string] = query.dateFrom;
      if (query.dateTo) dateFilter[Op.lte as unknown as string] = query.dateTo;
      where.invoiceDate = dateFilter;
    }

    return this.invoicesRepository.findAll({
      tenantId,
      where,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['invoiceNumber', 'reference'],
      sortBy: query.sortBy ?? 'invoiceDate',
      sortOrder: query.sortOrder ?? 'DESC',
    });
  }

  // ── Single ───────────────────────────────────────────────────────────────────

  async findById(tenantId: string, id: string) {
    const invoice = await this.invoicesRepository.findByIdWithLines(tenantId, id);
    if (!invoice) {
      throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Invoice', id));
    }
    return invoice;
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  async create(
    tenantId: string,
    dto: CreateInvoiceDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.invoicesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // Bug 5: Validate partner is active
      const partner = await this.partnersRepository.findByIdOrNull(dto.partnerId, { tenantId });
      if (!partner) {
        throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Partner', dto.partnerId));
      }
      const partnerRecord = partner as unknown as Record<string, unknown>;
      if (partnerRecord.isActive === false) {
        throw new BadRequestException(msg(ErrorMessages.PARTNER_INACTIVE, dto.partnerId));
      }

      // Bug 7: Duplicate vendor bill detection for in_invoice
      if (dto.invoiceType === InvoiceTypeNew.IN_INVOICE && dto.reference && dto.invoiceDate) {
        const duplicate = await this.invoicesRepository.findOne({
          tenantId,
          where: {
            partnerId: dto.partnerId,
            reference: dto.reference,
            invoiceDate: dto.invoiceDate,
            invoiceType: InvoiceTypeNew.IN_INVOICE,
          },
        });
        if (duplicate) {
          throw new ConflictException(
            msg(ErrorMessages.DUPLICATE_VENDOR_BILL, dto.partnerId, dto.reference, dto.invoiceDate),
          );
        }
      }

      // Bug 4: Validate original invoice for credit notes / refunds
      const isRefundType =
        dto.invoiceType === InvoiceTypeNew.OUT_REFUND ||
        dto.invoiceType === InvoiceTypeNew.IN_REFUND;
      if (isRefundType && dto.originalInvoiceId) {
        const originalInvoice = await this.invoicesRepository.findByIdOrNull(
          dto.originalInvoiceId,
          { tenantId },
        );
        if (!originalInvoice) {
          throw new NotFoundException(
            msg(ErrorMessages.ORIGINAL_INVOICE_NOT_FOUND, dto.originalInvoiceId),
          );
        }
        const originalRecord = originalInvoice as unknown as Record<string, unknown>;
        const originalTotal = parseFloat(String(originalRecord.amountTotal ?? 0));
        // We will check after computing totals below
        // Store for later validation
        (dto as any)._originalInvoiceTotal = originalTotal;
      }

      const invoiceNumber = await this.sequencesService.nextNumber(
        tenantId,
        INVOICE_SEQUENCE_ENTITY,
        dto.branchId,
      );

      // Compute line totals
      const computedLines = await this.computeLineTotals(tenantId, dto.lines);
      const amountUntaxed = computedLines.reduce((sum, l) => sum + l.priceSubtotal, 0);
      const amountTax = computedLines.reduce((sum, l) => sum + l.priceTax, 0);
      const amountTotal = amountUntaxed + amountTax;
      const exchangeRate = dto.exchangeRate ?? 1;
      const amountTotalBase = Math.round(amountTotal * exchangeRate * 100) / 100;

      // Bug 4 cont.: Cap credit note amount against original invoice
      if (isRefundType && dto.originalInvoiceId && (dto as any)._originalInvoiceTotal != null) {
        const originalTotal = (dto as any)._originalInvoiceTotal as number;
        const roundedTotal = Math.round(amountTotal * 100) / 100;
        if (roundedTotal > originalTotal) {
          throw new BadRequestException(
            msg(ErrorMessages.CREDIT_NOTE_EXCEEDS_ORIGINAL, roundedTotal, originalTotal),
          );
        }
      }

      const invoice = await this.invoicesRepository.create(
        {
          branchId: dto.branchId,
          partnerId: dto.partnerId,
          invoiceType: dto.invoiceType,
          status: InvoiceStatusNew.DRAFT,
          paymentStatus: InvoicePaymentStatus.NOT_PAID,
          invoiceNumber,
          invoiceDate: dto.invoiceDate,
          dueDate: dto.dueDate ?? null,
          paymentTermId: dto.paymentTermId ?? null,
          saleOrderId: dto.saleOrderId ?? null,
          purchaseOrderId: dto.purchaseOrderId ?? null,
          currencyId: dto.currencyId ?? null,
          exchangeRate,
          amountUntaxed: Math.round(amountUntaxed * 100) / 100,
          amountTax: Math.round(amountTax * 100) / 100,
          amountTotal: Math.round(amountTotal * 100) / 100,
          amountResidual: Math.round(amountTotal * 100) / 100,
          amountTotalBase,
          reference: dto.reference ?? null,
          narration: dto.narration ?? null,
          fiscalPositionId: dto.fiscalPositionId ?? null,
          journalId: dto.journalId ?? null,
          originalInvoiceId: dto.originalInvoiceId ?? null,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const invoiceRecord = invoice as unknown as Record<string, unknown>;
      const invoiceId = invoiceRecord.id as string;

      // Insert lines
      await this.insertLines(
        tenantId,
        invoiceId,
        dto.branchId,
        dto.lines,
        computedLines,
        auditContext,
        transaction,
      );

      await this.auditService.logCreate(
        tenantId,
        'invoice',
        invoiceId,
        { invoiceNumber, invoiceType: dto.invoiceType, partnerId: dto.partnerId },
        auditContext.userId,
      );

      if (isOwner) await transaction.commit();
      return this.invoicesRepository.findByIdWithLines(tenantId, invoiceId);
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  async update(
    tenantId: string,
    id: string,
    dto: UpdateInvoiceDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.invoicesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const existing = await this.invoicesRepository.findByIdOrNull(id, { tenantId, transaction });
      if (!existing) throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Invoice', id));

      const record = existing as unknown as Record<string, unknown>;
      if (record.status !== InvoiceStatusNew.DRAFT) {
        throw new BadRequestException(msg(ErrorMessages.INVOICE_DRAFT_ONLY_EDIT));
      }

      // Build update data
      const updateData: Record<string, unknown> = {};
      if (dto.partnerId !== undefined) updateData.partnerId = dto.partnerId;
      if (dto.invoiceDate !== undefined) updateData.invoiceDate = dto.invoiceDate;
      if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate;
      if (dto.paymentTermId !== undefined) updateData.paymentTermId = dto.paymentTermId;
      if (dto.saleOrderId !== undefined) updateData.saleOrderId = dto.saleOrderId;
      if (dto.purchaseOrderId !== undefined) updateData.purchaseOrderId = dto.purchaseOrderId;
      if (dto.currencyId !== undefined) updateData.currencyId = dto.currencyId;
      if (dto.exchangeRate !== undefined) updateData.exchangeRate = dto.exchangeRate;
      if (dto.reference !== undefined) updateData.reference = dto.reference;
      if (dto.narration !== undefined) updateData.narration = dto.narration;
      if (dto.fiscalPositionId !== undefined) updateData.fiscalPositionId = dto.fiscalPositionId;
      if (dto.journalId !== undefined) updateData.journalId = dto.journalId;

      // Recalculate if lines are updated
      if (dto.lines !== undefined) {
        const branchId = record.branchId as string;

        // Delete old lines and their taxes
        await this.invoiceLinesRepository.deleteByInvoiceId(id, transaction);

        const computedLines = await this.computeLineTotals(tenantId, dto.lines);
        const amountUntaxed = computedLines.reduce((sum, l) => sum + l.priceSubtotal, 0);
        const amountTax = computedLines.reduce((sum, l) => sum + l.priceTax, 0);
        const amountTotal = amountUntaxed + amountTax;
        const exchangeRate = (dto.exchangeRate ?? record.exchangeRate) as number;
        const amountTotalBase = Math.round(amountTotal * exchangeRate * 100) / 100;

        updateData.amountUntaxed = Math.round(amountUntaxed * 100) / 100;
        updateData.amountTax = Math.round(amountTax * 100) / 100;
        updateData.amountTotal = Math.round(amountTotal * 100) / 100;
        updateData.amountResidual = Math.round(amountTotal * 100) / 100;
        updateData.amountTotalBase = amountTotalBase;

        await this.insertLines(
          tenantId,
          id,
          branchId,
          dto.lines,
          computedLines,
          auditContext,
          transaction,
        );
      }

      if (Object.keys(updateData).length > 0) {
        await this.invoicesRepository.update(id, updateData as any, {
          tenantId,
          auditContext,
          transaction,
        });
      }

      if (isOwner) await transaction.commit();
      return this.invoicesRepository.findByIdWithLines(tenantId, id);
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Post ─────────────────────────────────────────────────────────────────────

  async post(
    tenantId: string,
    id: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.invoicesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const existing = await this.invoicesRepository.findByIdOrNull(id, { tenantId, transaction });
      if (!existing) throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Invoice', id));

      const record = existing as unknown as Record<string, unknown>;
      this.statusTransitionService.validateOrThrow(
        INVOICE_TRANSITION_ENTITY,
        record.status as string,
        InvoiceStatusNew.POSTED,
      );

      // Validate invoice has lines
      const lines = await this.invoiceLinesRepository.findByInvoiceId(id, transaction);
      if (lines.length === 0) {
        throw new BadRequestException(msg(ErrorMessages.INVOICE_NO_LINES, id));
      }

      // Determine accounts for journal entry
      const invoiceType = record.invoiceType as InvoiceTypeNew;
      const isCustomerInvoice =
        invoiceType === InvoiceTypeNew.OUT_INVOICE || invoiceType === InvoiceTypeNew.OUT_REFUND;

      const receivableKey = isCustomerInvoice ? 'coaAccountsReceivable' : 'coaAccountsPayable';
      const receivableAccountId = await this.requireSetting(tenantId, receivableKey);
      const salesAccountId = await this.requireSetting(
        tenantId,
        isCustomerInvoice ? 'coaSalesRevenue' : 'coaPurchasesExpense',
      );
      const vatAccountId = await this.requireSetting(tenantId, 'coaVatPayable');

      const amountUntaxed = parseFloat(String(record.amountUntaxed));
      const amountTax = parseFloat(String(record.amountTax));
      const amountTotal = parseFloat(String(record.amountTotal));
      const invoiceNumber = record.invoiceNumber as string;
      const invoiceDate = record.invoiceDate as string;

      const isRefund =
        invoiceType === InvoiceTypeNew.OUT_REFUND || invoiceType === InvoiceTypeNew.IN_REFUND;

      // Build journal lines
      const journalLines: Array<{
        accountId: string;
        debit: number;
        credit: number;
        description?: string;
      }> = [];

      if (isCustomerInvoice && !isRefund) {
        // Customer invoice: DR Receivable, CR Revenue + CR VAT
        journalLines.push(
          { accountId: receivableAccountId, debit: amountTotal, credit: 0 },
          { accountId: salesAccountId, debit: 0, credit: amountUntaxed },
        );
        if (amountTax > 0) {
          journalLines.push({ accountId: vatAccountId, debit: 0, credit: amountTax });
        }
      } else if (isCustomerInvoice && isRefund) {
        // Customer refund: DR Revenue + DR VAT, CR Receivable
        journalLines.push({ accountId: salesAccountId, debit: amountUntaxed, credit: 0 });
        if (amountTax > 0) {
          journalLines.push({ accountId: vatAccountId, debit: amountTax, credit: 0 });
        }
        journalLines.push({ accountId: receivableAccountId, debit: 0, credit: amountTotal });
      } else if (!isCustomerInvoice && !isRefund) {
        // Vendor invoice: DR Expense + DR Input VAT, CR Payable
        journalLines.push({ accountId: salesAccountId, debit: amountUntaxed, credit: 0 });
        if (amountTax > 0) {
          journalLines.push({ accountId: vatAccountId, debit: amountTax, credit: 0 });
        }
        journalLines.push({ accountId: receivableAccountId, debit: 0, credit: amountTotal });
      } else {
        // Vendor refund: DR Payable, CR Expense + CR VAT
        journalLines.push(
          { accountId: receivableAccountId, debit: amountTotal, credit: 0 },
          { accountId: salesAccountId, debit: 0, credit: amountUntaxed },
        );
        if (amountTax > 0) {
          journalLines.push({ accountId: vatAccountId, debit: 0, credit: amountTax });
        }
      }

      // Post journal entry
      await this.journalPosterService.post(
        tenantId,
        {
          entryDate: invoiceDate,
          description: `Invoice ${invoiceNumber}`,
          referenceId: id,
          referenceType: 'invoice',
          lines: journalLines.map((l) => ({
            ...l,
            currencyCode: 'SAR',
            exchangeRate: 1,
          })),
        },
        auditContext,
        transaction,
      );

      await this.invoicesRepository.update(id, { status: InvoiceStatusNew.POSTED } as any, {
        tenantId,
        auditContext,
        transaction,
      });

      await this.auditService.logStatusChange(
        tenantId,
        'invoice',
        id,
        InvoiceStatusNew.DRAFT,
        InvoiceStatusNew.POSTED,
        auditContext.userId,
      );

      if (isOwner) await transaction.commit();
      return this.invoicesRepository.findByIdWithLines(tenantId, id);
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Cancel ───────────────────────────────────────────────────────────────────

  async cancel(
    tenantId: string,
    id: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.invoicesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const existing = await this.invoicesRepository.findByIdOrNull(id, { tenantId, transaction });
      if (!existing) throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Invoice', id));

      const record = existing as unknown as Record<string, unknown>;
      const currentStatus = record.status as string;

      this.statusTransitionService.validateOrThrow(
        INVOICE_TRANSITION_ENTITY,
        currentStatus,
        InvoiceStatusNew.CANCELLED,
      );

      // Validate no payments linked
      const hasPayments = await this.invoicePaymentsRepository.existsForInvoice(
        id,
        tenantId,
        transaction,
      );
      if (hasPayments) {
        throw new BadRequestException(msg(ErrorMessages.INVOICE_HAS_PAYMENTS, id));
      }

      await this.invoicesRepository.update(id, { status: InvoiceStatusNew.CANCELLED } as any, {
        tenantId,
        auditContext,
        transaction,
      });

      await this.auditService.logStatusChange(
        tenantId,
        'invoice',
        id,
        currentStatus,
        InvoiceStatusNew.CANCELLED,
        auditContext.userId,
      );

      if (isOwner) await transaction.commit();
      return this.invoicesRepository.findByIdWithLines(tenantId, id);
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Register Payment ─────────────────────────────────────────────────────────

  async registerPayment(
    tenantId: string,
    invoiceId: string,
    dto: RegisterPaymentDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.invoicesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const invoice = await this.invoicesRepository.findByIdOrNull(invoiceId, {
        tenantId,
        transaction,
      });
      if (!invoice) throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Invoice', invoiceId));

      const invoiceRecord = invoice as unknown as Record<string, unknown>;
      if (invoiceRecord.status !== InvoiceStatusNew.POSTED) {
        throw new BadRequestException(msg(ErrorMessages.INVOICE_NOT_POSTED, invoiceId));
      }

      const amountResidual = parseFloat(String(invoiceRecord.amountResidual));
      if (dto.amount > amountResidual) {
        throw new BadRequestException(
          msg(ErrorMessages.INVOICE_PAYMENT_EXCEEDS_RESIDUAL, dto.amount, amountResidual),
        );
      }

      // Determine payment type from invoice type
      const invoiceType = invoiceRecord.invoiceType as InvoiceTypeNew;
      const isInbound =
        invoiceType === InvoiceTypeNew.OUT_INVOICE || invoiceType === InvoiceTypeNew.IN_REFUND;
      const paymentType = isInbound ? PaymentTypeNew.INBOUND : PaymentTypeNew.OUTBOUND;

      const branchId = invoiceRecord.branchId as string;
      const partnerId = invoiceRecord.partnerId as string;
      const exchangeRate = dto.exchangeRate ?? (invoiceRecord.exchangeRate as number);
      const amountBase = Math.round(dto.amount * exchangeRate * 100) / 100;

      // Generate payment number
      const paymentNumber = await this.sequencesService.nextNumber(
        tenantId,
        PAYMENT_SEQUENCE_ENTITY,
        branchId,
      );

      // Create the payment
      const payment = await this.paymentsNewRepository.create(
        {
          branchId,
          partnerId,
          paymentType,
          status: PaymentStatusNew.POSTED,
          paymentNumber,
          paymentDate: dto.paymentDate,
          amount: dto.amount,
          currencyId: dto.currencyId ?? (invoiceRecord.currencyId as string | null),
          exchangeRate,
          amountBase,
          memo: dto.memo ?? `Payment for ${invoiceRecord.invoiceNumber}`,
          treasuryAccountId: dto.treasuryAccountId ?? null,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const paymentRecord = payment as unknown as Record<string, unknown>;
      const paymentId = paymentRecord.id as string;

      // Link payment to invoice
      await this.invoicePaymentsRepository.create(
        {
          branchId,
          invoiceId,
          paymentId,
          amount: dto.amount,
        } as any,
        { tenantId, auditContext, transaction },
      );

      // Update invoice residual and payment status
      const newResidual = Math.round((amountResidual - dto.amount) * 100) / 100;
      const newPaymentStatus =
        newResidual <= 0 ? InvoicePaymentStatus.PAID : InvoicePaymentStatus.PARTIAL;

      await this.invoicesRepository.update(
        invoiceId,
        {
          amountResidual: newResidual,
          paymentStatus: newPaymentStatus,
        } as any,
        { tenantId, auditContext, transaction },
      );

      // Post journal entry for the payment
      const isCustomerInvoice =
        invoiceType === InvoiceTypeNew.OUT_INVOICE || invoiceType === InvoiceTypeNew.OUT_REFUND;
      const cashAccountId = await this.requireSetting(tenantId, 'coaCash');
      const receivableKey = isCustomerInvoice ? 'coaAccountsReceivable' : 'coaAccountsPayable';
      const receivableAccountId = await this.requireSetting(tenantId, receivableKey);

      const journalLines = isInbound
        ? [
            {
              accountId: cashAccountId,
              debit: dto.amount,
              credit: 0,
              currencyCode: 'SAR',
              exchangeRate: 1,
            },
            {
              accountId: receivableAccountId,
              debit: 0,
              credit: dto.amount,
              currencyCode: 'SAR',
              exchangeRate: 1,
            },
          ]
        : [
            {
              accountId: receivableAccountId,
              debit: dto.amount,
              credit: 0,
              currencyCode: 'SAR',
              exchangeRate: 1,
            },
            {
              accountId: cashAccountId,
              debit: 0,
              credit: dto.amount,
              currencyCode: 'SAR',
              exchangeRate: 1,
            },
          ];

      await this.journalPosterService.post(
        tenantId,
        {
          entryDate: dto.paymentDate,
          description: `Payment ${paymentNumber} for Invoice ${invoiceRecord.invoiceNumber}`,
          referenceId: paymentId,
          referenceType: 'payment',
          lines: journalLines,
        },
        auditContext,
        transaction,
      );

      if (isOwner) await transaction.commit();
      return this.invoicesRepository.findByIdWithLines(tenantId, invoiceId);
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  // ── Soft Delete ──────────────────────────────────────────────────────────────

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.invoicesRepository.findByIdOrNull(id, { tenantId });
    if (!existing) throw new NotFoundException(msg(ErrorMessages.NOT_FOUND, 'Invoice', id));

    const record = existing as unknown as Record<string, unknown>;
    if (record.status !== InvoiceStatusNew.DRAFT) {
      throw new BadRequestException(msg(ErrorMessages.INVOICE_DRAFT_ONLY_DELETE));
    }

    await this.invoicesRepository.softDelete(id, { tenantId, auditContext });
    await this.auditService.logDelete(tenantId, 'invoice', id, {}, auditContext.userId);
  }

  // ── Private Helpers ──────────────────────────────────────────────────────────

  private async computeLineTotals(
    tenantId: string,
    lines: CreateInvoiceLineDto[],
  ): Promise<Array<{ priceSubtotal: number; priceTax: number; priceTotal: number }>> {
    // Resolve the tenant VAT rate from settings, fallback to 15
    let defaultVatRate = 15;
    try {
      const tenantVatRate = await this.unifiedSettings.getNumber(tenantId, 'vatRate');
      if (tenantVatRate != null && tenantVatRate > 0) {
        defaultVatRate = tenantVatRate;
      }
    } catch {
      // Keep default 15
    }

    const results: Array<{ priceSubtotal: number; priceTax: number; priceTotal: number }> = [];

    for (const line of lines) {
      const qty = line.quantity;
      const price = line.unitPrice;
      const discount = line.discountPct ?? 0;

      const lineSubtotal = qty * price * (1 - discount / 100);
      const priceSubtotal = Math.round(lineSubtotal * 100) / 100;

      // Use TaxSharedService to calculate tax from product taxes if taxIds provided,
      // otherwise fall back to tenant VAT rate
      let priceTax: number;
      if (line.taxIds && line.taxIds.length > 0) {
        const taxResult = await this.taxSharedService.calculateProductTax(
          tenantId,
          priceSubtotal,
          line.productId,
        );
        priceTax = taxResult.totalTax;
      } else {
        priceTax = Math.round(priceSubtotal * defaultVatRate) / 100;
      }

      const priceTotal = Math.round((priceSubtotal + priceTax) * 100) / 100;
      results.push({ priceSubtotal, priceTax, priceTotal });
    }

    return results;
  }

  private async insertLines(
    tenantId: string,
    invoiceId: string,
    branchId: string,
    lines: CreateInvoiceLineDto[],
    computedLines: Array<{ priceSubtotal: number; priceTax: number; priceTotal: number }>,
    auditContext: AuditContext,
    transaction: Transaction,
  ): Promise<void> {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const computed = computedLines[i];

      const createdLine = await this.invoiceLinesRepository.create(
        {
          branchId,
          invoiceId,
          productId: line.productId ?? null,
          productVariantId: line.productVariantId ?? null,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPct: line.discountPct ?? 0,
          priceSubtotal: computed.priceSubtotal,
          priceTax: computed.priceTax,
          priceTotal: computed.priceTotal,
          accountId: line.accountId ?? null,
          sequence: line.sequence ?? i,
        } as any,
        { tenantId, auditContext, transaction },
      );

      // Insert line taxes if provided
      if (line.taxIds && line.taxIds.length > 0) {
        const lineRecord = createdLine as unknown as Record<string, unknown>;
        const lineId = lineRecord.id as string;
        for (const taxId of line.taxIds) {
          await this.invoiceLineTaxesRepository.create({ invoiceLineId: lineId, taxId } as any, {
            tenantId,
            auditContext,
            transaction,
          });
        }
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────

  async getSummary(tenantId: string, query: FilterInvoiceDto) {
    const sequelize = this.invoicesRepository.getSequelize();
    const replacements: Record<string, unknown> = { tenantId };
    let filter = '';

    if (query.invoiceType) {
      filter += ` AND inv."invoiceType" = :invoiceType`;
      replacements.invoiceType = query.invoiceType;
    }
    if (query.partnerId) {
      filter += ` AND inv."partnerId" = :partnerId`;
      replacements.partnerId = query.partnerId;
    }
    if (query.branchId) {
      filter += ` AND inv."branchId" = :branchId`;
      replacements.branchId = query.branchId;
    }
    if (query.dateFrom) {
      filter += ` AND inv."invoiceDate" >= :dateFrom`;
      replacements.dateFrom = query.dateFrom;
    }
    if (query.dateTo) {
      filter += ` AND inv."invoiceDate" <= :dateTo`;
      replacements.dateTo = query.dateTo;
    }

    const [rows] = await sequelize.query(
      `SELECT
         COUNT(*)::int AS "totalRecords",
         COUNT(*) FILTER (WHERE inv.status = '${InvoiceStatusNew.DRAFT}')::int AS "totalDraft",
         COUNT(*) FILTER (WHERE inv.status = '${InvoiceStatusNew.POSTED}')::int AS "totalPosted",
         COUNT(*) FILTER (WHERE inv.status = '${InvoiceStatusNew.CANCELLED}')::int AS "totalCancelled",
         COUNT(*) FILTER (WHERE inv."paymentStatus" = '${InvoicePaymentStatus.NOT_PAID}' AND inv.status = '${InvoiceStatusNew.POSTED}')::int AS "totalUnpaid",
         COUNT(*) FILTER (WHERE inv."paymentStatus" = '${InvoicePaymentStatus.PARTIAL}' AND inv.status = '${InvoiceStatusNew.POSTED}')::int AS "totalPartial",
         COUNT(*) FILTER (WHERE inv."paymentStatus" = '${InvoicePaymentStatus.PAID}')::int AS "totalPaid",
         COALESCE(SUM(inv."amountTotal") FILTER (WHERE inv.status = '${InvoiceStatusNew.POSTED}'), 0)::numeric(15,2) AS "totalAmount",
         COALESCE(SUM(inv."amountResidual") FILTER (WHERE inv.status = '${InvoiceStatusNew.POSTED}'), 0)::numeric(15,2) AS "totalAmountDue"
       FROM invoices inv
       WHERE inv."tenantId" = :tenantId AND inv."deletedAt" IS NULL ${filter}`,
      { replacements },
    );

    const row = (rows as any[])[0] ?? {};
    return {
      totalRecords: row.totalRecords ?? 0,
      totalDraft: row.totalDraft ?? 0,
      totalPosted: row.totalPosted ?? 0,
      totalCancelled: row.totalCancelled ?? 0,
      totalUnpaid: row.totalUnpaid ?? 0,
      totalPartial: row.totalPartial ?? 0,
      totalPaid: row.totalPaid ?? 0,
      totalAmount: parseFloat(row.totalAmount ?? '0'),
      totalAmountDue: parseFloat(row.totalAmountDue ?? '0'),
    };
  }

  private async requireSetting(tenantId: string, key: string): Promise<string> {
    const value = await this.unifiedSettings.get(tenantId, key);
    if (!value) {
      throw new BadRequestException(msg(ErrorMessages.ACCOUNTING_SETTING_MISSING, key));
    }
    return value;
  }
}
