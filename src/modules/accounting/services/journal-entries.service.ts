import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Transaction } from 'sequelize';
import { JournalEntriesRepository } from '@/database/sql/repositories/journal-entries.repository';
import { JournalLinesRepository } from '@/database/sql/repositories/journal-lines.repository';
import { ChartOfAccountsRepository } from '@/database/sql/repositories/chart-of-accounts.repository';
import { JournalsRepository } from '@/database/sql/repositories/journals.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { JournalEntryType } from '@/common/enums/accounting.enums';
import { JournalEntryTypeNew, JournalType } from '@/common/enums/accounting-new.enums';
import { UnifiedSettingsService } from '@/modules/settings/services/unified-settings.service';
import { CurrencyService } from '@/modules/currency/currency.service';
import { FiscalPeriodsService } from './fiscal-periods.service';
import { CreateJournalEntryDto } from '../dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from '../dto/update-journal-entry.dto';
import { CreateJournalLineDto } from '../dto/create-journal-line.dto';

@Injectable()
export class JournalEntriesService {
  private readonly logger = new Logger(JournalEntriesService.name);

  constructor(
    private readonly journalEntriesRepository: JournalEntriesRepository,
    private readonly journalLinesRepository: JournalLinesRepository,
    private readonly coaRepository: ChartOfAccountsRepository,
    private readonly journalsRepository: JournalsRepository,
    private readonly fiscalPeriodsService: FiscalPeriodsService,
    private readonly currencyService: CurrencyService,
    private readonly unifiedSettings: UnifiedSettingsService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.journalEntriesRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['entryNumber'],
      sortBy: 'entryDate',
      sortOrder: query.sortOrder ?? 'DESC',
    });
  }

  async findById(tenantId: string, id: string) {
    const entry = await this.journalEntriesRepository.findByIdWithLines(tenantId, id);
    if (!entry) throw new NotFoundException(msg(ErrorMessages.JOURNAL_NOT_FOUND, id));
    return entry;
  }

  async create(
    tenantId: string,
    dto: CreateJournalEntryDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.journalEntriesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // Validate lines balance (DR = CR) before persisting
      await this.validateLines(
        tenantId,
        dto.lines.map((l) => ({
          accountId: l.accountId,
          partnerId: l.partnerId ?? null,
          debit: l.debit,
          credit: l.credit,
        })) as unknown as Record<string, unknown>[],
      );

      // Validate fiscal period is open for the entry date
      await this.fiscalPeriodsService.resolvePeriod(tenantId, dto.entryDate, transaction);

      // Resolve journal — use provided journalId or default to general journal
      let journalId = dto.journalId ?? null;
      let sequencePrefix: string | null = null;

      if (journalId) {
        const journal = await this.journalsRepository.findByIdOrNull(journalId, {
          tenantId,
          transaction,
        });
        if (!journal) {
          throw new NotFoundException(msg(ErrorMessages.JOURNAL_SETUP_NOT_FOUND, journalId));
        }
        sequencePrefix = (journal as unknown as Record<string, unknown>).sequencePrefix as
          | string
          | null;
      } else {
        // Try to find a default general journal
        const generalJournal = await this.journalsRepository.findByType(
          tenantId,
          JournalType.GENERAL,
          transaction,
        );
        if (generalJournal) {
          const gjRecord = generalJournal as unknown as Record<string, unknown>;
          journalId = gjRecord.id as string;
          sequencePrefix = gjRecord.sequencePrefix as string | null;
        }
      }

      const entryNumber = await this.journalEntriesRepository.nextEntryNumberForJournal(
        tenantId,
        sequencePrefix,
        transaction,
      );

      const entry = await this.journalEntriesRepository.create(
        {
          entryNumber,
          entryDate: dto.entryDate,
          entryType: dto.entryType ?? JournalEntryType.MANUAL,
          entryTypeNew: dto.entryTypeNew ?? JournalEntryTypeNew.MANUAL,
          journalId,
          description: dto.description ?? null,
          referenceId: dto.referenceId ?? null,
          referenceType: dto.referenceType ?? null,
          isPosted: false,
          isReversed: false,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const entryRecord = entry as unknown as Record<string, unknown>;
      const entryId = entryRecord.id as string;

      await this.insertLines(entryId, dto.lines, transaction);

      if (isOwner) await transaction.commit();
      return this.journalEntriesRepository.findByIdWithLines(tenantId, entryId);
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateJournalEntryDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.journalEntriesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const entry = await this.journalEntriesRepository.findByIdOrNull(id, {
        tenantId,
        transaction,
      });
      if (!entry) throw new NotFoundException(msg(ErrorMessages.JOURNAL_NOT_FOUND, id));

      const entryRecord = entry as unknown as Record<string, unknown>;
      if (entryRecord.isPosted === true) {
        throw new BadRequestException(msg(ErrorMessages.JOURNAL_ALREADY_POSTED, id));
      }

      const updateData: Record<string, unknown> = {};
      if (dto.entryDate !== undefined) updateData.entryDate = dto.entryDate;
      if (dto.description !== undefined) updateData.description = dto.description;

      if (Object.keys(updateData).length > 0) {
        await this.journalEntriesRepository.update(id, updateData as any, {
          tenantId,
          auditContext,
          transaction,
        });
      }

      if (dto.lines !== undefined) {
        await this.journalLinesRepository.deleteByEntryId(id, transaction);
        await this.insertLines(id, dto.lines, transaction);
      }

      if (isOwner) await transaction.commit();
      return this.journalEntriesRepository.findByIdWithLines(tenantId, id);
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async post(
    tenantId: string,
    id: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.journalEntriesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const entry = await this.journalEntriesRepository.findByIdOrNull(id, {
        tenantId,
        transaction,
      });
      if (!entry) throw new NotFoundException(msg(ErrorMessages.JOURNAL_NOT_FOUND, id));

      const entryRecord = entry as unknown as Record<string, unknown>;
      if (entryRecord.isPosted === true) {
        throw new BadRequestException(msg(ErrorMessages.JOURNAL_ALREADY_POSTED, id));
      }

      // Get lines for validation
      const lines = await this.journalLinesRepository.findByEntryId(id, transaction);
      await this.validateLines(tenantId, lines as unknown as Record<string, unknown>[]);

      // Resolve fiscal period
      const entryDate = entryRecord.entryDate as string;

      // Validate against fiscal lock date
      await this.validateFiscalLockDate(tenantId, entryDate);

      const period = await this.fiscalPeriodsService.resolvePeriod(
        tenantId,
        entryDate,
        transaction,
      );
      const periodRecord = period as unknown as Record<string, unknown>;

      // Entry number was already assigned on create — do NOT reassign on post.
      // Only reversal entries get a new number (handled in reverse()).

      await this.journalEntriesRepository.update(
        id,
        {
          isPosted: true,
          postedAt: new Date(),
          postedBy: auditContext.userId ?? null,
          periodId: periodRecord.id,
        } as any,
        { tenantId, auditContext, transaction },
      );

      if (isOwner) await transaction.commit();
      return this.journalEntriesRepository.findByIdWithLines(tenantId, id);
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async reverse(
    tenantId: string,
    id: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.journalEntriesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const original = await this.journalEntriesRepository.findByIdWithLines(tenantId, id);
      if (!original) throw new NotFoundException(msg(ErrorMessages.JOURNAL_NOT_FOUND, id));

      const originalRecord = original as unknown as Record<string, unknown>;

      if (!originalRecord.isPosted) {
        throw new BadRequestException(msg(ErrorMessages.JOURNAL_NOT_POSTED, id));
      }

      if (originalRecord.isReversed || originalRecord.reversedBy) {
        throw new ConflictException(msg(ErrorMessages.JOURNAL_ALREADY_REVERSED, id));
      }

      const originalDate = (originalRecord.entryDate as string) ?? (originalRecord.date as string);

      // Validate against fiscal lock date
      await this.validateFiscalLockDate(tenantId, originalDate);

      const period = await this.fiscalPeriodsService.resolvePeriod(
        tenantId,
        originalDate,
        transaction,
      );
      const periodRecord = period as unknown as Record<string, unknown>;

      // Use the same journal as the original entry
      const journalId = originalRecord.journalId as string | null;
      let sequencePrefix: string | null = null;
      if (journalId) {
        const journal = await this.journalsRepository.findByIdOrNull(journalId, {
          tenantId,
          transaction,
        });
        if (journal) {
          sequencePrefix = (journal as unknown as Record<string, unknown>).sequencePrefix as
            | string
            | null;
        }
      }

      const reversalNumber = await this.journalEntriesRepository.nextEntryNumberForJournal(
        tenantId,
        sequencePrefix,
        transaction,
      );

      const reversal = await this.journalEntriesRepository.create(
        {
          entryNumber: reversalNumber,
          entryDate: originalDate,
          entryType: JournalEntryType.REVERSAL,
          entryTypeNew: JournalEntryTypeNew.REVERSAL,
          journalId,
          description: `Reversal of ${originalRecord.entryNumber}`,
          reversalOf: id,
          isPosted: true,
          isReversed: false,
          postedAt: new Date(),
          postedBy: auditContext.userId ?? null,
          periodId: periodRecord.id,
        } as any,
        { tenantId, auditContext, transaction },
      );

      const reversalRecord = reversal as unknown as Record<string, unknown>;
      const reversalId = reversalRecord.id as string;

      // Swap debits and credits
      const originalLines = (originalRecord.lines ?? []) as Array<Record<string, unknown>>;
      const reversedLines = originalLines.map((line) => ({
        accountId: line.accountId as string,
        partnerId: (line.partnerId as string | null) ?? null,
        costCenterId: (line.costCenterId as string | null) ?? null,
        debit: parseFloat(String(line.credit ?? 0)),
        credit: parseFloat(String(line.debit ?? 0)),
        description: line.description as string | null,
        currencyCode: (line.currency as string) ?? 'SAR',
        currencyId: (line.currencyId as string | null) ?? null,
        amountCurrency:
          line.amountCurrency != null ? parseFloat(String(line.amountCurrency)) : null,
        exchangeRate: parseFloat(String(line.exchangeRate ?? 1)),
      }));

      await this.journalLinesRepository.bulkInsertLines(reversalId, reversedLines, transaction);

      // Mark original as reversed
      await this.journalEntriesRepository.update(
        id,
        { reversedBy: reversalId, isReversed: true } as any,
        {
          tenantId,
          auditContext,
          transaction,
        },
      );

      if (isOwner) await transaction.commit();
      return this.journalEntriesRepository.findByIdWithLines(tenantId, reversalId);
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const entry = await this.journalEntriesRepository.findByIdOrNull(id, { tenantId });
    if (!entry) throw new NotFoundException(msg(ErrorMessages.JOURNAL_NOT_FOUND, id));

    const entryRecord = entry as unknown as Record<string, unknown>;
    if (entryRecord.isPosted === true) {
      throw new BadRequestException(msg(ErrorMessages.JOURNAL_DRAFT_ONLY));
    }

    await this.journalEntriesRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async insertLines(
    entryId: string,
    lines: CreateJournalLineDto[],
    transaction: Transaction,
  ): Promise<void> {
    const mapped = lines.map((line) => ({
      accountId: line.accountId,
      partnerId: line.partnerId ?? null,
      costCenterId: line.costCenterId ?? null,
      debit: line.debit,
      credit: line.credit,
      description: line.description ?? null,
      currencyCode: line.currencyCode ?? 'SAR',
      currencyId: line.currencyId ?? null,
      amountCurrency: line.amountCurrency ?? null,
      exchangeRate: line.exchangeRate ?? 1,
    }));

    await this.journalLinesRepository.bulkInsertLines(entryId, mapped, transaction);
  }

  private async validateLines(
    tenantId: string,
    lines: Array<Record<string, unknown>>,
  ): Promise<void> {
    if (lines.length === 0) {
      throw new BadRequestException(msg(ErrorMessages.JOURNAL_EMPTY));
    }

    const totalDebit = lines.reduce((sum, l) => sum + parseFloat(String(l.debit ?? 0)), 0);
    const totalCredit = lines.reduce((sum, l) => sum + parseFloat(String(l.credit ?? 0)), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        msg(
          ErrorMessages.JOURNAL_UNBALANCED,
          Math.round(totalDebit * 100) / 100,
          Math.round(totalCredit * 100) / 100,
        ),
      );
    }

    for (const line of lines) {
      const debit = parseFloat(String(line.debit ?? 0));
      const credit = parseFloat(String(line.credit ?? 0));

      if (!((debit > 0 && credit === 0) || (credit > 0 && debit === 0))) {
        throw new BadRequestException(msg(ErrorMessages.JOURNAL_LINE_INVALID));
      }

      const account = await this.coaRepository.findByIdOrNull(line.accountId as string, {
        tenantId,
      });
      if (!account) {
        throw new NotFoundException(msg(ErrorMessages.ACCOUNT_NOT_FOUND, line.accountId as string));
      }

      const accountRecord = account as unknown as Record<string, unknown>;

      if (!accountRecord.allowDirectPosting) {
        throw new BadRequestException(
          msg(ErrorMessages.ACCOUNT_NO_DIRECT_POSTING, accountRecord.code as string),
        );
      }

      if (!accountRecord.isActive) {
        throw new BadRequestException(
          msg(ErrorMessages.ACCOUNT_INACTIVE, accountRecord.code as string),
        );
      }

      if (accountRecord.isDeprecated) {
        throw new BadRequestException(
          msg(ErrorMessages.ACCOUNT_DEPRECATED, accountRecord.code as string),
        );
      }

      // Validate partner requirement for reconcilable accounts (AR/AP)
      if (accountRecord.isReconcilable && !line.partnerId) {
        throw new BadRequestException(
          msg(ErrorMessages.PARTNER_REQUIRED_FOR_ACCOUNT, accountRecord.code as string),
        );
      }
    }
  }

  /**
   * Validates that the entry date is not on or before the fiscal lock date.
   * The fiscal lock date prevents any posting before a certain date.
   */
  private async validateFiscalLockDate(tenantId: string, entryDate: string): Promise<void> {
    const lockDate = await this.unifiedSettings.get(tenantId, 'fiscalLockDate');
    if (lockDate && entryDate <= lockDate) {
      throw new BadRequestException(
        msg(ErrorMessages.FISCAL_LOCK_DATE_VIOLATION, entryDate, lockDate),
      );
    }
  }
}
