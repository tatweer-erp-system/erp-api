jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/email-templates.repository', () => ({
  EmailTemplatesRepository: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplatesRepository } from '@/database/sql/repositories/email-templates.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';

describe('EmailTemplatesService', () => {
  let service: EmailTemplatesService;

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockTemplatesRepo = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    bulkUpdate: jest.fn(),
    createTransaction: jest.fn().mockResolvedValue(mockTransaction),
  };

  const mockOutboxService = {
    createEvent: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001' };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTemplatesRepo.createTransaction.mockResolvedValue(mockTransaction);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTemplatesService,
        { provide: EmailTemplatesRepository, useValue: mockTemplatesRepo },
        { provide: OutboxSharedService, useValue: mockOutboxService },
      ],
    }).compile();

    service = module.get<EmailTemplatesService>(EmailTemplatesService);
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      nameEn: 'Invoice Template',
      nameAr: 'قالب الفاتورة',
      model: 'invoice',
      subject: 'Invoice {{ record.invoiceNumber }}',
      bodyEn: '<p>Dear customer, your invoice {{ record.invoiceNumber }} is ready.</p>',
      bodyAr: '<p>عزيزي العميل، فاتورتك {{ record.invoiceNumber }} جاهزة.</p>',
    };

    it('should create a template with defaults', async () => {
      mockTemplatesRepo.create.mockResolvedValue({ id: 'et1', ...baseDto });

      const result = await service.create(tenantId, baseDto as any, auditContext);

      expect(mockTemplatesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nameEn: 'Invoice Template',
          nameAr: 'قالب الفاتورة',
          model: 'invoice',
          subject: baseDto.subject,
          bodyEn: baseDto.bodyEn,
          bodyAr: baseDto.bodyAr,
          fromEmail: null,
          replyTo: null,
          ccEmails: null,
          autoAttachPdf: false,
          isDefault: false,
          isActive: true,
        }),
        expect.objectContaining({ tenantId, auditContext }),
      );
      expect(result.id).toBe('et1');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should clear existing default when creating a new default template', async () => {
      mockTemplatesRepo.create.mockResolvedValue({ id: 'et2', isDefault: true });

      await service.create(tenantId, { ...baseDto, isDefault: true } as any, auditContext);

      expect(mockTemplatesRepo.bulkUpdate).toHaveBeenCalledWith({
        where: { model: 'invoice', isDefault: true },
        data: { isDefault: false },
        tenantId,
        transaction: mockTransaction,
      });
    });

    it('should not clear existing defaults when isDefault is false', async () => {
      mockTemplatesRepo.create.mockResolvedValue({ id: 'et3' });

      await service.create(tenantId, { ...baseDto, isDefault: false } as any, auditContext);

      expect(mockTemplatesRepo.bulkUpdate).not.toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockTemplatesRepo.create.mockRejectedValue(new Error('DB error'));

      await expect(service.create(tenantId, baseDto as any, auditContext)).rejects.toThrow(
        'DB error',
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated templates', async () => {
      const expected = { data: [{ id: 'et1' }], meta: { total: 1 } };
      mockTemplatesRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll(tenantId, {} as any);

      expect(result).toEqual(expected);
    });

    it('should filter by model when provided', async () => {
      mockTemplatesRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      await service.findAll(tenantId, { model: 'invoice' } as any);

      expect(mockTemplatesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { model: 'invoice' },
          searchFields: ['nameEn', 'nameAr', 'subject'],
        }),
      );
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return template when found', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue({ id: 'et1', nameEn: 'Invoice Template' });

      const result = await service.findById(tenantId, 'et1');

      expect(result).toEqual({ id: 'et1', nameEn: 'Invoice Template' });
    });

    it('should throw NotFoundException when template not found', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    const existing = { id: 'et1', model: 'invoice', nameEn: 'Invoice Template' };

    it('should update template', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue(existing);
      mockTemplatesRepo.update.mockResolvedValue({ ...existing, nameEn: 'Updated' });

      const result = await service.update(
        tenantId,
        'et1',
        { nameEn: 'Updated' } as any,
        auditContext,
      );

      expect(result.nameEn).toBe('Updated');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw NotFoundException when template not found', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'missing', { nameEn: 'X' } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should clear existing defaults for same model when setting isDefault', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue(existing);
      mockTemplatesRepo.update.mockResolvedValue({ ...existing, isDefault: true });

      await service.update(tenantId, 'et1', { isDefault: true } as any, auditContext);

      expect(mockTemplatesRepo.bulkUpdate).toHaveBeenCalledWith({
        where: { model: 'invoice', isDefault: true },
        data: { isDefault: false },
        tenantId,
        transaction: mockTransaction,
      });
    });

    it('should use model from dto when provided while setting isDefault', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue(existing);
      mockTemplatesRepo.update.mockResolvedValue({ ...existing, model: 'order', isDefault: true });

      await service.update(
        tenantId,
        'et1',
        { isDefault: true, model: 'order' } as any,
        auditContext,
      );

      expect(mockTemplatesRepo.bulkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { model: 'order', isDefault: true } }),
      );
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete template', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue({ id: 'et1' });

      await service.remove(tenantId, 'et1', auditContext);

      expect(mockTemplatesRepo.softDelete).toHaveBeenCalledWith('et1', { tenantId, auditContext });
    });

    it('should throw NotFoundException when template not found', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── preview ──────────────────────────────────────────────────────────────

  describe('preview', () => {
    it('should resolve {{ record.id }} variable in templates', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue({
        id: 'et1',
        model: 'invoice',
        subject: 'Invoice for {{ record.id }}',
        bodyEn: '<p>Record: {{ record.id }}</p>',
        bodyAr: '<p>السجل: {{ record.id }}</p>',
        fromEmail: 'noreply@test.com',
        replyTo: null,
        ccEmails: null,
      });

      const result = await service.preview(tenantId, 'et1', 'rec-123');

      expect(result.subject).toBe('Invoice for rec-123');
      expect(result.bodyEn).toBe('<p>Record: rec-123</p>');
      expect(result.bodyAr).toBe('<p>السجل: rec-123</p>');
      expect(result.fromEmail).toBe('noreply@test.com');
    });

    it('should resolve {{ record.model }} variable', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue({
        id: 'et1',
        model: 'invoice',
        subject: 'Type: {{ record.model }}',
        bodyEn: '{{ record.model }}',
        bodyAr: '{{ record.model }}',
        fromEmail: null,
        replyTo: null,
        ccEmails: null,
      });

      const result = await service.preview(tenantId, 'et1', 'rec-123');

      expect(result.subject).toBe('Type: invoice');
      expect(result.bodyEn).toBe('invoice');
    });

    it('should resolve {{ company.tenantId }} variable', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue({
        id: 'et1',
        model: 'invoice',
        subject: 'Tenant: {{ company.tenantId }}',
        bodyEn: '{{ company.tenantId }}',
        bodyAr: '{{ company.tenantId }}',
        fromEmail: null,
        replyTo: null,
        ccEmails: null,
      });

      const result = await service.preview(tenantId, 'et1', 'rec-123');

      expect(result.subject).toBe('Tenant: tenant-001');
    });

    it('should leave unresolved variables as-is', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue({
        id: 'et1',
        model: 'invoice',
        subject: 'Hello {{ customer.name }}',
        bodyEn: '{{ unknown.var }}',
        bodyAr: '{{ unknown.var }}',
        fromEmail: null,
        replyTo: null,
        ccEmails: null,
      });

      const result = await service.preview(tenantId, 'et1', 'rec-123');

      expect(result.subject).toBe('Hello {{ customer.name }}');
      expect(result.bodyEn).toBe('{{ unknown.var }}');
    });

    it('should handle multiple variables in one template', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue({
        id: 'et1',
        model: 'order',
        subject: '{{ record.model }} - {{ record.id }}',
        bodyEn: 'Model: {{ record.model }}, ID: {{ record.id }}, Tenant: {{ company.tenantId }}',
        bodyAr: '',
        fromEmail: null,
        replyTo: null,
        ccEmails: null,
      });

      const result = await service.preview(tenantId, 'et1', 'ord-456');

      expect(result.subject).toBe('order - ord-456');
      expect(result.bodyEn).toBe('Model: order, ID: ord-456, Tenant: tenant-001');
    });

    it('should handle variables with extra whitespace', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue({
        id: 'et1',
        model: 'invoice',
        subject: '{{  record.id  }}',
        bodyEn: '{{ record.id }}',
        bodyAr: '',
        fromEmail: null,
        replyTo: null,
        ccEmails: null,
      });

      const result = await service.preview(tenantId, 'et1', 'rec-789');

      expect(result.subject).toBe('rec-789');
    });
  });

  // ── send ─────────────────────────────────────────────────────────────────

  describe('send', () => {
    const activeTemplate = {
      id: 'et1',
      model: 'invoice',
      nameEn: 'Invoice Template',
      subject: 'Invoice {{ record.id }}',
      bodyEn: '<p>{{ record.id }}</p>',
      bodyAr: '<p>{{ record.id }}</p>',
      fromEmail: 'noreply@test.com',
      replyTo: 'support@test.com',
      ccEmails: 'cc@test.com',
      autoAttachPdf: true,
      isActive: true,
    };

    it('should create outbox event for email delivery', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue(activeTemplate);

      const result = await service.send(
        tenantId,
        {
          templateId: 'et1',
          recordId: 'inv-001',
          toEmails: ['customer@test.com'],
        } as any,
        auditContext,
      );

      expect(mockOutboxService.createEvent).toHaveBeenCalledWith(
        mockTransaction,
        tenantId,
        'EMAIL_SEND_REQUESTED',
        expect.objectContaining({
          templateId: 'et1',
          recordId: 'inv-001',
          toEmails: ['customer@test.com'],
          subject: 'Invoice inv-001',
          bodyEn: '<p>inv-001</p>',
          bodyAr: '<p>inv-001</p>',
          fromEmail: 'noreply@test.com',
          replyTo: 'support@test.com',
          ccEmails: 'cc@test.com',
          autoAttachPdf: true,
          model: 'invoice',
        }),
        'inv-001',
        'invoice',
      );
      expect(result).toEqual({
        message: 'Email queued for delivery',
        toEmails: ['customer@test.com'],
        subject: 'Invoice inv-001',
      });
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw BadRequestException when template is inactive', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue({
        ...activeTemplate,
        isActive: false,
      });

      await expect(
        service.send(
          tenantId,
          { templateId: 'et1', recordId: 'inv-001', toEmails: ['x@test.com'] } as any,
          auditContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include extraNote when provided', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue(activeTemplate);

      await service.send(
        tenantId,
        {
          templateId: 'et1',
          recordId: 'inv-001',
          toEmails: ['x@test.com'],
          extraNote: 'Please review',
        } as any,
        auditContext,
      );

      expect(mockOutboxService.createEvent).toHaveBeenCalledWith(
        expect.any(Object),
        tenantId,
        'EMAIL_SEND_REQUESTED',
        expect.objectContaining({ extraNote: 'Please review' }),
        expect.any(String),
        expect.any(String),
      );
    });

    it('should rollback transaction on outbox event creation failure', async () => {
      mockTemplatesRepo.findOne.mockResolvedValue(activeTemplate);
      mockOutboxService.createEvent.mockRejectedValue(new Error('Outbox fail'));

      await expect(
        service.send(
          tenantId,
          { templateId: 'et1', recordId: 'inv-001', toEmails: ['x@test.com'] } as any,
          auditContext,
        ),
      ).rejects.toThrow('Outbox fail');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
