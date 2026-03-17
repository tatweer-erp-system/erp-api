import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { EmailTemplatesRepository } from '@/database/sql/repositories/email-templates.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { CreateEmailTemplateDto } from '../dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from '../dto/update-email-template.dto';
import { FilterEmailTemplateDto } from '../dto/filter-email-template.dto';
import { SendEmailDto } from '../dto/send-email.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

/** Simple {{ variable }} pattern for template resolution */
const VARIABLE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

@Injectable()
export class EmailTemplatesService {
  constructor(
    private readonly emailTemplatesRepository: EmailTemplatesRepository,
    private readonly outboxSharedService: OutboxSharedService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(
    tenantId: string,
    dto: CreateEmailTemplateDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.emailTemplatesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      // If isDefault is true, clear existing default for same model
      if (dto.isDefault) {
        await this.emailTemplatesRepository.bulkUpdate({
          where: { model: dto.model, isDefault: true },
          data: { isDefault: false } as any,
          tenantId,
          transaction,
        });
      }

      const template = await this.emailTemplatesRepository.create(
        {
          nameEn: dto.nameEn,
          nameAr: dto.nameAr,
          model: dto.model,
          subject: dto.subject,
          bodyEn: dto.bodyEn,
          bodyAr: dto.bodyAr,
          fromEmail: dto.fromEmail ?? null,
          replyTo: dto.replyTo ?? null,
          ccEmails: dto.ccEmails ?? null,
          autoAttachPdf: dto.autoAttachPdf ?? false,
          isDefault: dto.isDefault ?? false,
          isActive: true,
        } as any,
        { tenantId, transaction, auditContext },
      );

      if (isOwner) await transaction.commit();
      return template;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async findAll(tenantId: string, filter: FilterEmailTemplateDto) {
    const where: Record<string, unknown> = {};
    if (filter.model) {
      where.model = filter.model;
    }

    return this.emailTemplatesRepository.findAll({
      tenantId,
      where,
      page: filter.page,
      limit: filter.limit,
      search: filter.search,
      searchFields: ['nameEn', 'nameAr', 'subject'],
      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    const template = await this.emailTemplatesRepository.findOne({
      tenantId,
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(msg(ErrorMessages.EMAIL_TEMPLATE_NOT_FOUND, id));
    }
    return template;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateEmailTemplateDto,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.emailTemplatesRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const existing = await this.emailTemplatesRepository.findOne({
        tenantId,
        where: { id },
        transaction,
      });
      if (!existing) {
        throw new NotFoundException(msg(ErrorMessages.EMAIL_TEMPLATE_NOT_FOUND, id));
      }

      // If setting as default, clear others for the same model
      if (dto.isDefault) {
        const model = dto.model ?? (existing as any).model;
        await this.emailTemplatesRepository.bulkUpdate({
          where: { model, isDefault: true },
          data: { isDefault: false } as any,
          tenantId,
          transaction,
        });
      }

      const updated = await this.emailTemplatesRepository.update(id, dto as any, {
        tenantId,
        transaction,
        auditContext,
      });

      if (isOwner) await transaction.commit();
      return updated;
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const template = await this.emailTemplatesRepository.findOne({
      tenantId,
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(msg(ErrorMessages.EMAIL_TEMPLATE_NOT_FOUND, id));
    }
    await this.emailTemplatesRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Preview & Send ────────────────────────────────────────────────────────

  async preview(tenantId: string, templateId: string, recordId: string) {
    const template = await this.findById(tenantId, templateId);
    const tpl = template as any;

    // Build a simple context object from the record
    // In a real scenario this would load the actual record from the appropriate model
    const context = await this.buildVariableContext(tenantId, tpl.model, recordId);

    return {
      subject: this.resolveVariables(tpl.subject, context),
      bodyEn: this.resolveVariables(tpl.bodyEn, context),
      bodyAr: this.resolveVariables(tpl.bodyAr, context),
      fromEmail: tpl.fromEmail,
      replyTo: tpl.replyTo,
      ccEmails: tpl.ccEmails,
    };
  }

  async send(tenantId: string, dto: SendEmailDto, auditContext: AuditContext) {
    const template = await this.findById(tenantId, dto.templateId);
    const tpl = template as any;

    if (!tpl.isActive) {
      throw new BadRequestException(msg(ErrorMessages.EMAIL_TEMPLATE_INACTIVE, tpl.nameEn));
    }

    const context = await this.buildVariableContext(tenantId, tpl.model, dto.recordId);

    const resolvedSubject = this.resolveVariables(tpl.subject, context);
    const resolvedBodyEn = this.resolveVariables(tpl.bodyEn, context);
    const resolvedBodyAr = this.resolveVariables(tpl.bodyAr, context);

    // Create transaction for outbox event
    const transaction = await this.emailTemplatesRepository.createTransaction({});

    try {
      await this.outboxSharedService.createEvent(
        transaction,
        tenantId,
        'EMAIL_SEND_REQUESTED',
        {
          templateId: dto.templateId,
          recordId: dto.recordId,
          toEmails: dto.toEmails,
          ccEmails: tpl.ccEmails,
          fromEmail: tpl.fromEmail,
          replyTo: tpl.replyTo,
          subject: resolvedSubject,
          bodyEn: resolvedBodyEn,
          bodyAr: resolvedBodyAr,
          autoAttachPdf: tpl.autoAttachPdf,
          extraNote: dto.extraNote ?? null,
          model: tpl.model,
        },
        dto.recordId,
        tpl.model,
      );

      await transaction.commit();

      return {
        message: 'Email queued for delivery',
        toEmails: dto.toEmails,
        subject: resolvedSubject,
      };
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  // ── Variable resolution ───────────────────────────────────────────────────

  /**
   * Builds a flat context map for variable resolution.
   * Keys follow the pattern: "record.fieldName", "company.fieldName", "user.fieldName".
   * This is a placeholder that returns the recordId — real implementations would
   * load the actual record from the corresponding model table.
   */
  private async buildVariableContext(
    tenantId: string,
    model: string,
    recordId: string,
  ): Promise<Record<string, string>> {
    // Base context with record reference — extended per model in a full implementation
    const context: Record<string, string> = {
      'record.id': recordId,
      'record.model': model,
      'company.tenantId': tenantId,
    };

    return context;
  }

  /**
   * Simple string replacement for {{ variable }} placeholders.
   * Unresolved variables are left as-is so the user can see what's missing.
   */
  private resolveVariables(template: string, context: Record<string, string>): string {
    return template.replace(VARIABLE_PATTERN, (match, key: string) => {
      const trimmedKey = key.trim();
      return context[trimmedKey] !== undefined ? context[trimmedKey] : match;
    });
  }
}
